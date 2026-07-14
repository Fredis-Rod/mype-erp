-- =====================================================================
-- MYPE-ERP  |  0001 — Esquema base
-- Multiempresa. Moneda USD. Costeo: promedio ponderado.
-- Cada tabla lleva business_id para aislar datos por negocio (ver 0002_rls).
-- =====================================================================

create extension if not exists pgcrypto;

-- Negocios (tenants)
create table businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  currency    text not null default 'USD',
  created_by  uuid not null default auth.uid(),
  created_at  timestamptz not null default now()
);

-- Membresía usuario <-> negocio, con rol
create table memberships (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('admin','empleado')),
  created_at  timestamptz not null default now(),
  unique (business_id, user_id)
);

-- Clientes (para ventas al crédito / cuentas por cobrar)
create table customers (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name        text not null,
  phone       text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- Productos (avg_cost es SENSIBLE: se oculta a empleados vía product_catalog)
create table products (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  sku         text,
  name        text not null,
  category    text,
  sale_price  numeric(12,2) not null default 0,
  stock_qty   numeric(14,3) not null default 0,
  avg_cost    numeric(14,4) not null default 0,
  min_stock   numeric(14,3) not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (business_id, sku)
);

-- Compras (ingreso de inventario)
create table purchases (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  supplier    text,
  date        date not null default current_date,
  total       numeric(14,2) not null default 0,
  created_by  uuid not null default auth.uid(),
  created_at  timestamptz not null default now()
);

create table purchase_items (
  id          uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  product_id  uuid not null references products(id),
  qty         numeric(14,3) not null check (qty > 0),
  unit_cost   numeric(14,4) not null check (unit_cost >= 0)
);

-- Ventas (contado o crédito). client_uuid = idempotencia para reintentos.
create table sales (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  date           date not null default current_date,
  total          numeric(14,2) not null default 0,
  payment_type   text not null check (payment_type in ('contado','credito')),
  customer_id    uuid references customers(id),
  amount_paid    numeric(14,2) not null default 0,
  payment_method text,
  needs_review   boolean not null default false,
  client_uuid    uuid not null unique,
  created_by     uuid not null default auth.uid(),
  created_at     timestamptz not null default now()
);

create table sale_items (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid not null references sales(id) on delete cascade,
  product_id  uuid not null references products(id),
  qty         numeric(14,3) not null check (qty > 0),
  unit_price  numeric(14,2) not null,
  unit_cost   numeric(14,4) not null
);

-- Abonos a cuentas por cobrar
create table receivable_payments (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  sale_id     uuid not null references sales(id) on delete cascade,
  customer_id uuid references customers(id),
  date        date not null default current_date,
  amount      numeric(14,2) not null check (amount > 0),
  method      text,
  created_by  uuid not null default auth.uid(),
  created_at  timestamptz not null default now()
);

-- Gastos
create table expenses (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  date        date not null default current_date,
  category    text,
  amount      numeric(14,2) not null check (amount > 0),
  description text,
  created_by  uuid not null default auth.uid(),
  created_at  timestamptz not null default now()
);

-- Libro de caja. amount con signo: entradas (+), salidas (-)
create table cash_movements (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  date        date not null default current_date,
  type        text not null check (type in ('venta_efectivo','abono_cxc','gasto','deposito','retiro')),
  amount      numeric(14,2) not null,
  reference   text,
  created_by  uuid not null default auth.uid(),
  created_at  timestamptz not null default now()
);

-- Índices para consultas frecuentes por negocio/fecha
create index idx_memberships_user      on memberships (user_id);
create index idx_products_business     on products (business_id);
create index idx_customers_business    on customers (business_id);
create index idx_sales_business_date   on sales (business_id, date);
create index idx_sale_items_sale       on sale_items (sale_id);
create index idx_purchases_business    on purchases (business_id, date);
create index idx_purchase_items_pur    on purchase_items (purchase_id);
create index idx_rp_business_sale      on receivable_payments (business_id, sale_id);
create index idx_cash_business_date    on cash_movements (business_id, date);
create index idx_expenses_business     on expenses (business_id, date);
