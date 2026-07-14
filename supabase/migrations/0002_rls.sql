-- =====================================================================
-- MYPE-ERP  |  0002 — Seguridad: helpers, vista de catálogo y RLS
-- Regla de oro: el aislamiento entre negocios y la ocultación de costos
-- a los empleados se garantizan AQUÍ (base de datos), no solo en la UI.
-- =====================================================================

-- Helpers SECURITY DEFINER (se ejecutan como owner => no disparan las
-- políticas RLS de memberships, evitando recursión).
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

-- Catálogo SIN costo, visible a AMBOS roles para vender/listar.
-- Vista SECURITY DEFINER (dueño postgres) + filtro explícito por membresía:
-- expone solo columnas no sensibles y solo del negocio del usuario.
create view product_catalog
with (security_invoker = false) as
  select id, business_id, sku, name, category, sale_price, stock_qty, min_stock, active
  from products
  where is_member(business_id);

grant select on product_catalog to authenticated;

-- Activar RLS en todas las tablas
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

-- businesses: miembros ven; solo admin edita/borra. Creación vía create_business().
create policy biz_select on businesses for select using (is_member(id));
create policy biz_update on businesses for update using (is_admin(id)) with check (is_admin(id));
create policy biz_delete on businesses for delete using (is_admin(id));

-- memberships: miembros ven; admin gestiona (crear/editar/borrar empleados).
create policy mem_select on memberships for select using (is_member(business_id));
create policy mem_admin  on memberships for all using (is_admin(business_id)) with check (is_admin(business_id));

-- customers: cualquier miembro
create policy cust_all on customers for all using (is_member(business_id)) with check (is_member(business_id));

-- products: SOLO admin (la tabla base contiene el costo). Empleado usa product_catalog.
create policy prod_admin on products for all using (is_admin(business_id)) with check (is_admin(business_id));

-- purchases / purchase_items: SOLO admin (costos). Alta real vía register_purchase().
create policy pur_admin on purchases for select using (is_admin(business_id));
create policy puri_admin on purchase_items for select
  using (exists (select 1 from purchases p where p.id = purchase_id and is_admin(p.business_id)));

-- sales / sale_items: miembros ven. Alta real vía register_sale() (atómica).
create policy sale_select on sales for select using (is_member(business_id));
create policy sitem_select on sale_items for select
  using (exists (select 1 from sales s where s.id = sale_id and is_member(s.business_id)));

-- receivable_payments: miembros ven. Alta vía register_payment().
create policy rp_select on receivable_payments for select using (is_member(business_id));

-- expenses: SOLO admin (finanzas)
create policy exp_admin on expenses for all using (is_admin(business_id)) with check (is_admin(business_id));

-- cash_movements: miembros ven. Escritura vía RPCs.
create policy cash_select on cash_movements for select using (is_member(business_id));
