-- =====================================================================
-- MYPE-ERP  |  0003 — RPCs de negocio (crear negocio, agregar empleado)
-- =====================================================================

-- Crear un negocio y dejar al creador como admin, en una sola transacción.
-- SECURITY DEFINER evita el problema huevo-gallina con RLS (la membresía
-- aún no existe al momento de insertar el negocio).
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

-- Asociar a un usuario existente (por email) como empleado/admin del negocio.
-- En v1 el empleado debe haberse registrado antes (crea su cuenta).
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

-- Listar miembros de un negocio con su correo (lee auth.users => definer).
create or replace function public.list_members(p_business_id uuid)
returns table (user_id uuid, role text, email text)
language sql security definer set search_path = public as $$
  select m.user_id, m.role, u.email::text
  from memberships m
  join auth.users u on u.id = m.user_id
  where m.business_id = p_business_id
    and is_member(p_business_id)   -- solo miembros del negocio pueden listar
  order by m.created_at;
$$;

grant execute on function public.create_business(text) to authenticated;
grant execute on function public.add_employee(uuid, text, text) to authenticated;
grant execute on function public.list_members(uuid) to authenticated;
