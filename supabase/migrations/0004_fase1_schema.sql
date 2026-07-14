-- =====================================================================
-- MYPE-ERP  |  0004 — Fase 1: inventario, compras, proveedores, CxP
-- Se aplica SOBRE el esquema de la Fase 0 (0001-0003).
-- =====================================================================

-- Unidad de medida en productos (unidad, libra, kg, litro, caja, ...)
alter table products add column if not exists unit text not null default 'unidad';

-- Proveedores
create table if not exists suppliers (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name        text not null,
  phone       text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- Enlace muchos-a-muchos: un producto puede tener varios proveedores
create table if not exists product_suppliers (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  supplier_id uuid not null references suppliers(id) on delete cascade,
  supplier_sku text,
  last_cost   numeric(14,4),
  created_at  timestamptz not null default now(),
  unique (product_id, supplier_id)
);

-- Compras: proveedor referenciado + tipo de pago + lo pagado (para CxP)
alter table purchases add column if not exists supplier_id  uuid references suppliers(id);
alter table purchases add column if not exists payment_type text not null default 'contado' check (payment_type in ('contado','credito'));
alter table purchases add column if not exists amount_paid  numeric(14,2) not null default 0;

-- Pagos a cuentas por pagar (abonos a proveedores)
create table if not exists payable_payments (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  purchase_id uuid not null references purchases(id) on delete cascade,
  supplier_id uuid references suppliers(id),
  date        date not null default current_date,
  amount      numeric(14,2) not null check (amount > 0),
  method      text,
  created_by  uuid not null default auth.uid(),
  created_at  timestamptz not null default now()
);

-- Ampliar tipos de movimiento de caja (compra en efectivo, pago a proveedor)
alter table cash_movements drop constraint if exists cash_movements_type_check;
alter table cash_movements add constraint cash_movements_type_check
  check (type in ('venta_efectivo','abono_cxc','compra_efectivo','pago_cxp','gasto','deposito','retiro'));

-- Recrear el catálogo (sin costo) incluyendo la unidad de medida
drop view if exists product_catalog;
create view product_catalog
with (security_invoker = false) as
  select id, business_id, sku, name, category, unit, sale_price, stock_qty, min_stock, active
  from products
  where is_member(business_id);
grant select on product_catalog to authenticated;

-- RLS de las tablas nuevas (todas de ámbito administrativo)
alter table suppliers         enable row level security;
alter table product_suppliers enable row level security;
alter table payable_payments  enable row level security;

create policy sup_admin on suppliers for all
  using (is_admin(business_id)) with check (is_admin(business_id));

create policy ps_admin on product_suppliers for all
  using (is_admin(business_id)) with check (is_admin(business_id));

-- Pagos a proveedores: admin ve; la escritura va por register_payable_payment()
create policy pp_select on payable_payments for select using (is_admin(business_id));

-- Índices
create index if not exists idx_suppliers_business  on suppliers (business_id);
create index if not exists idx_ps_product          on product_suppliers (product_id);
create index if not exists idx_ps_supplier         on product_suppliers (supplier_id);
create index if not exists idx_purchases_supplier  on purchases (supplier_id);
create index if not exists idx_pp_purchase         on payable_payments (purchase_id);
