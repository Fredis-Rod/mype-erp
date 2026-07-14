-- =====================================================================
-- MYPE-ERP  |  0006 — Fase 2: ventas, crédito (CxC) y caja
-- Se aplica sobre las fases 0 y 1.
-- =====================================================================

-- Descuento al total de la venta (los descuentos por línea van en unit_price)
alter table sales add column if not exists discount numeric(14,2) not null default 0;

-- Endurecer la caja: solo el administrador puede leer el libro de caja
-- (incluye salidas por compras/gastos que el empleado no debe ver).
drop policy if exists cash_select on cash_movements;
create policy cash_select on cash_movements for select using (is_admin(business_id));

-- Registrar una venta de forma atómica:
--  - congela el costo (avg_cost) de cada producto en el renglón
--  - descuenta stock (permite negativo pero marca needs_review)
--  - calcula total = subtotal - descuento
--  - la caja sube SOLO por lo cobrado en efectivo
--  - el saldo (crédito) queda como Cuenta por Cobrar
--  - idempotente por client_uuid (reintentos offline)
-- p_items: jsonb array de { product_id, qty, unit_price }
create or replace function public.register_sale(
  p_business_id   uuid,
  p_customer_id   uuid,
  p_date          date,
  p_payment_type  text,
  p_payment_method text,
  p_amount_paid   numeric,
  p_discount      numeric,
  p_items         jsonb,
  p_client_uuid   uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_sale_id  uuid;
  v_subtotal numeric(14,2) := 0;
  v_total    numeric(14,2);
  v_paid     numeric(14,2);
  v_review   boolean := false;
  v_item     jsonb;
  v_pid      uuid;
  v_qty      numeric(14,3);
  v_price    numeric(14,2);
  v_cost     numeric(14,4);
  v_stock    numeric(14,3);
begin
  if not is_member(p_business_id) then
    raise exception 'no autorizado';
  end if;
  if p_payment_type not in ('contado','credito') then
    raise exception 'tipo de pago inválido';
  end if;

  -- Idempotencia: si ya existe esta venta (reintento offline), devolverla.
  select id into v_sale_id from sales
    where client_uuid = p_client_uuid and business_id = p_business_id;
  if found then return v_sale_id; end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'la venta no tiene productos';
  end if;
  if p_payment_type = 'credito' and p_customer_id is null then
    raise exception 'una venta al crédito necesita un cliente';
  end if;

  insert into sales (business_id, customer_id, date, payment_type, payment_method,
                     total, discount, amount_paid, needs_review, client_uuid, created_by)
    values (p_business_id, p_customer_id, coalesce(p_date, current_date), p_payment_type,
            coalesce(p_payment_method, 'efectivo'), 0, coalesce(p_discount, 0), 0, false,
            p_client_uuid, auth.uid())
    returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pid   := (v_item->>'product_id')::uuid;
    v_qty   := (v_item->>'qty')::numeric;
    v_price := (v_item->>'unit_price')::numeric;
    if v_qty is null or v_qty <= 0 then raise exception 'cantidad inválida'; end if;

    select avg_cost, stock_qty into v_cost, v_stock
      from products where id = v_pid and business_id = p_business_id;
    if not found then raise exception 'un producto no pertenece al negocio'; end if;
    if v_price is null then v_price := 0; end if;
    if v_stock - v_qty < 0 then v_review := true; end if;

    insert into sale_items (sale_id, product_id, qty, unit_price, unit_cost)
      values (v_sale_id, v_pid, v_qty, v_price, v_cost);

    update products set stock_qty = stock_qty - v_qty where id = v_pid;

    v_subtotal := v_subtotal + round(v_qty * v_price, 2);
  end loop;

  v_total := greatest(v_subtotal - coalesce(p_discount, 0), 0);

  if p_payment_type = 'contado' then
    v_paid := v_total;
  else
    v_paid := least(greatest(coalesce(p_amount_paid, 0), 0), v_total);
  end if;

  update sales set total = v_total, amount_paid = v_paid, needs_review = v_review
    where id = v_sale_id;

  -- La caja sube solo si se cobró en efectivo
  if v_paid > 0 and coalesce(p_payment_method, 'efectivo') = 'efectivo' then
    insert into cash_movements (business_id, date, type, amount, reference, created_by)
      values (p_business_id, coalesce(p_date, current_date), 'venta_efectivo', v_paid,
              'Venta ' || left(v_sale_id::text, 8), auth.uid());
  end if;

  return v_sale_id;
end; $$;

-- Registrar un abono a una cuenta por cobrar (pago de cliente)
create or replace function public.register_receivable_payment(
  p_business_id uuid,
  p_sale_id     uuid,
  p_amount      numeric,
  p_date        date,
  p_method      text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id       uuid;
  v_customer uuid;
  v_total    numeric(14,2);
  v_paid     numeric(14,2);
  v_balance  numeric(14,2);
begin
  if not is_member(p_business_id) then
    raise exception 'no autorizado';
  end if;
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'monto inválido';
  end if;

  select customer_id, total, amount_paid into v_customer, v_total, v_paid
    from sales where id = p_sale_id and business_id = p_business_id;
  if not found then raise exception 'venta no encontrada'; end if;

  v_balance := v_total - v_paid
             - coalesce((select sum(amount) from receivable_payments where sale_id = p_sale_id), 0);
  if p_amount > v_balance + 0.001 then
    raise exception 'el abono (%) excede el saldo pendiente (%)', p_amount, v_balance;
  end if;

  insert into receivable_payments (business_id, sale_id, customer_id, date, amount, method, created_by)
    values (p_business_id, p_sale_id, v_customer, coalesce(p_date, current_date), p_amount, p_method, auth.uid())
    returning id into v_id;

  -- Solo el efectivo entra a la caja
  if coalesce(p_method, 'efectivo') = 'efectivo' then
    insert into cash_movements (business_id, date, type, amount, reference, created_by)
      values (p_business_id, coalesce(p_date, current_date), 'abono_cxc', p_amount,
              'Abono venta ' || left(p_sale_id::text, 8), auth.uid());
  end if;

  return v_id;
end; $$;

grant execute on function public.register_sale(uuid, uuid, date, text, text, numeric, numeric, jsonb, uuid) to authenticated;
grant execute on function public.register_receivable_payment(uuid, uuid, numeric, date, text) to authenticated;
