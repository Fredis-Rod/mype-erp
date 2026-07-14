-- =====================================================================
-- MYPE-ERP — Script único para aplicar en Supabase (SQL Editor)
-- Pega TODO este archivo y ejecútalo una sola vez en un proyecto nuevo.
-- Es la concatenación de las migraciones 0001 + 0002 + 0003.
-- =====================================================================


-- =====================================================================
-- 0001 — Esquema base
-- =====================================================================
create extension if not exists pgcrypto;

create table businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  currency    text not null default 'USD',
  created_by  uuid not null default auth.uid(),
  created_at  timestamptz not null default now()
);

create table memberships (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('admin','empleado')),
  created_at  timestamptz not null default now(),
  unique (business_id, user_id)
);

create table customers (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name        text not null,
  phone       text,
  notes       text,
  created_at  timestamptz not null default now()
);

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


-- =====================================================================
-- 0002 — Seguridad: helpers, vista de catálogo y RLS
-- =====================================================================
create or replace function public.is_member(bid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.business_id = bid and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_admin(bid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.business_id = bid and m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

create view product_catalog
with (security_invoker = false) as
  select id, business_id, sku, name, category, sale_price, stock_qty, min_stock, active
  from products
  where is_member(business_id);

grant select on product_catalog to authenticated;

alter table businesses          enable row level security;
alter table memberships         enable row level security;
alter table customers           enable row level security;
alter table products            enable row level security;
alter table purchases           enable row level security;
alter table purchase_items      enable row level security;
alter table sales               enable row level security;
alter table sale_items          enable row level security;
alter table receivable_payments enable row level security;
alter table expenses            enable row level security;
alter table cash_movements      enable row level security;

create policy biz_select on businesses for select using (is_member(id));
create policy biz_update on businesses for update using (is_admin(id)) with check (is_admin(id));
create policy biz_delete on businesses for delete using (is_admin(id));

create policy mem_select on memberships for select using (is_member(business_id));
create policy mem_admin  on memberships for all using (is_admin(business_id)) with check (is_admin(business_id));

create policy cust_all on customers for all using (is_member(business_id)) with check (is_member(business_id));

create policy prod_admin on products for all using (is_admin(business_id)) with check (is_admin(business_id));

create policy pur_admin on purchases for select using (is_admin(business_id));
create policy puri_admin on purchase_items for select
  using (exists (select 1 from purchases p where p.id = purchase_id and is_admin(p.business_id)));

create policy sale_select on sales for select using (is_member(business_id));
create policy sitem_select on sale_items for select
  using (exists (select 1 from sales s where s.id = sale_id and is_member(s.business_id)));

create policy rp_select on receivable_payments for select using (is_member(business_id));

create policy exp_admin on expenses for all using (is_admin(business_id)) with check (is_admin(business_id));

create policy cash_select on cash_movements for select using (is_member(business_id));


-- =====================================================================
-- 0003 — RPCs de negocio
-- =====================================================================
create or replace function public.create_business(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'no autenticado';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'el nombre del negocio es obligatorio';
  end if;

  insert into businesses (name, created_by) values (btrim(p_name), auth.uid())
    returning id into new_id;
  insert into memberships (business_id, user_id, role) values (new_id, auth.uid(), 'admin');
  return new_id;
end; $$;

create or replace function public.add_employee(p_business_id uuid, p_email text, p_role text default 'empleado')
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not is_admin(p_business_id) then
    raise exception 'solo el administrador puede agregar usuarios';
  end if;
  if p_role not in ('admin','empleado') then
    raise exception 'rol inválido';
  end if;

  select id into uid from auth.users where email = lower(btrim(p_email));
  if uid is null then
    raise exception 'No existe un usuario con el correo %. Pídele que se registre primero.', p_email;
  end if;

  insert into memberships (business_id, user_id, role)
    values (p_business_id, uid, p_role)
    on conflict (business_id, user_id) do update set role = excluded.role;
  return uid;
end; $$;

create or replace function public.list_members(p_business_id uuid)
returns table (user_id uuid, role text, email text)
language sql security definer set search_path = public as $$
  select m.user_id, m.role, u.email::text
  from memberships m
  join auth.users u on u.id = m.user_id
  where m.business_id = p_business_id
    and is_member(p_business_id)
  order by m.created_at;
$$;

grant execute on function public.create_business(text) to authenticated;
grant execute on function public.add_employee(uuid, text, text) to authenticated;
grant execute on function public.list_members(uuid) to authenticated;
