-- =====================================================================
-- MYPE-ERP  |  0005 — RPCs de compras y pagos a proveedores
-- =====================================================================

-- Registrar una compra (ingreso de inventario) de forma atómica:
--  - crea la compra y sus renglones
--  - recalcula costo promedio ponderado y aumenta stock por producto
--  - enlaza producto-proveedor
--  - si hay pago (contado o abono inicial), genera salida de caja
--  - deja el saldo pendiente como Cuenta por Pagar
-- p_items: jsonb array de { product_id, qty, unit_cost }
create or replace function public.register_purchase(
  p_business_id uuid,
  p_supplier_id uuid,
  p_date        date,
  p_payment_type text,
  p_amount_paid numeric,
  p_items       jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_purchase_id uuid;
  v_total   numeric(14,2) := 0;
  v_item    jsonb;
  v_pid     uuid;
  v_qty     numeric(14,3);
  v_cost    numeric(14,4);
  v_paid    numeric(14,2);
begin
  if not is_admin(p_business_id) then
    raise exception 'solo el administrador puede registrar compras';
  end if;
  if p_payment_type not in ('contado','credito') then
    raise exception 'tipo de pago inválido';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'la compra no tiene productos';
  end if;
  if p_supplier_id is not null then
    perform 1 from suppliers where id = p_supplier_id and business_id = p_business_id;
    if not found then raise exception 'el proveedor no pertenece al negocio'; end if;
  end if;

  insert into purchases (business_id, supplier_id, date, payment_type, total, amount_paid, created_by)
    values (p_business_id, p_supplier_id, coalesce(p_date, current_date), p_payment_type, 0, 0, auth.uid())
    returning id into v_purchase_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pid  := (v_item->>'product_id')::uuid;
    v_qty  := (v_item->>'qty')::numeric;
    v_cost := (v_item->>'unit_cost')::numeric;
    if v_qty is null or v_qty <= 0 then raise exception 'cantidad inválida'; end if;
    if v_cost is null or v_cost < 0 then raise exception 'costo inválido'; end if;

    perform 1 from products where id = v_pid and business_id = p_business_id;
    if not found then raise exception 'un producto no pertenece al negocio'; end if;

    insert into purchase_items (purchase_id, product_id, qty, unit_cost)
      values (v_purchase_id, v_pid, v_qty, v_cost);

    -- costo promedio ponderado + aumento de stock
    update products
      set avg_cost = case when (stock_qty + v_qty) > 0
                          then round(((stock_qty * avg_cost) + (v_qty * v_cost)) / (stock_qty + v_qty), 4)
                          else v_cost end,
          stock_qty = stock_qty + v_qty
      where id = v_pid;

    if p_supplier_id is not null then
      insert into product_suppliers (business_id, product_id, supplier_id, last_cost)
        values (p_business_id, v_pid, p_supplier_id, v_cost)
        on conflict (product_id, supplier_id) do update set last_cost = excluded.last_cost;
    end if;

    v_total := v_total + round(v_qty * v_cost, 2);
  end loop;

  if p_payment_type = 'contado' then
    v_paid := v_total;
  else
    v_paid := least(greatest(coalesce(p_amount_paid, 0), 0), v_total);
  end if;

  update purchases set total = v_total, amount_paid = v_paid where id = v_purchase_id;

  if v_paid > 0 then
    insert into cash_movements (business_id, date, type, amount, reference, created_by)
      values (p_business_id, coalesce(p_date, current_date), 'compra_efectivo', -v_paid,
              'Compra ' || left(v_purchase_id::text, 8), auth.uid());
  end if;

  return v_purchase_id;
end; $$;

-- Registrar un pago a una cuenta por pagar (abono a proveedor):
--  - valida que no exceda el saldo pendiente
--  - registra el pago y genera salida de caja
create or replace function public.register_payable_payment(
  p_business_id uuid,
  p_purchase_id uuid,
  p_amount      numeric,
  p_date        date,
  p_method      text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id       uuid;
  v_supplier uuid;
  v_total    numeric(14,2);
  v_paid     numeric(14,2);
  v_balance  numeric(14,2);
begin
  if not is_admin(p_business_id) then
    raise exception 'solo el administrador puede pagar a proveedores';
  end if;
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'monto inválido';
  end if;

  select supplier_id, total, amount_paid into v_supplier, v_total, v_paid
    from purchases where id = p_purchase_id and business_id = p_business_id;
  if not found then raise exception 'compra no encontrada'; end if;

  v_balance := v_total - v_paid
             - coalesce((select sum(amount) from payable_payments where purchase_id = p_purchase_id), 0);
  if p_amount > v_balance + 0.001 then
    raise exception 'el pago (%) excede el saldo pendiente (%)', p_amount, v_balance;
  end if;

  insert into payable_payments (business_id, purchase_id, supplier_id, date, amount, method, created_by)
    values (p_business_id, p_purchase_id, v_supplier, coalesce(p_date, current_date), p_amount, p_method, auth.uid())
    returning id into v_id;

  insert into cash_movements (business_id, date, type, amount, reference, created_by)
    values (p_business_id, coalesce(p_date, current_date), 'pago_cxp', -p_amount,
            'Pago compra ' || left(p_purchase_id::text, 8), auth.uid());

  return v_id;
end; $$;

grant execute on function public.register_purchase(uuid, uuid, date, text, numeric, jsonb) to authenticated;
grant execute on function public.register_payable_payment(uuid, uuid, numeric, date, text) to authenticated;
