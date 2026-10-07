-- =============================================================================
-- Fundapresai · is_admin() y Row Level Security
-- =============================================================================

-- -----------------------------------------------------------------------------
-- is_admin(): true si el usuario autenticado está en public.admins.
-- security definer para poder leer admins sin depender de sus políticas;
-- search_path vacío para evitar secuestro de objetos.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- RLS activo en todas las tablas
-- -----------------------------------------------------------------------------
alter table public.admins        enable row level security;
alter table public.site_settings enable row level security;
alter table public.campaigns     enable row level security;
alter table public.heartbeat     enable row level security;

-- -----------------------------------------------------------------------------
-- Privilegios de tabla (defensa en profundidad además de RLS).
-- Supabase concede ALL a anon/authenticated por defecto; se recorta aquí.
-- -----------------------------------------------------------------------------
revoke all on public.admins, public.site_settings, public.campaigns, public.heartbeat from anon, authenticated;

grant select on public.site_settings, public.campaigns to anon;

grant select on public.admins to authenticated;
grant select, update on public.site_settings to authenticated;
grant select, insert, update, delete on public.campaigns to authenticated;
-- heartbeat: sin privilegios para anon ni authenticated.

-- -----------------------------------------------------------------------------
-- campaigns
-- -----------------------------------------------------------------------------
create policy "campaigns: lectura pública de activas"
  on public.campaigns
  for select
  to anon, authenticated
  using (status = 'active');

create policy "campaigns: admins leen todo"
  on public.campaigns
  for select
  to authenticated
  using ((select public.is_admin()));

create policy "campaigns: admins crean"
  on public.campaigns
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "campaigns: admins editan"
  on public.campaigns
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "campaigns: admins borran"
  on public.campaigns
  for delete
  to authenticated
  using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- site_settings (sin insert ni delete: la fila id = 1 la crea el seed)
-- -----------------------------------------------------------------------------
create policy "site_settings: lectura pública"
  on public.site_settings
  for select
  to anon, authenticated
  using (true);

create policy "site_settings: admins editan"
  on public.site_settings
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- admins: cada usuario autenticado ve solo su propia fila. Sin escritura por API.
-- -----------------------------------------------------------------------------
create policy "admins: lectura propia"
  on public.admins
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- heartbeat: RLS activo y SIN políticas → nadie lo lee ni escribe por la API.

-- -----------------------------------------------------------------------------
-- set_featured_campaign(): marca una campaña como destacada y desmarca las demás
-- en una sola transacción (el índice único parcial impide dos destacadas).
-- security invoker: se aplican las políticas RLS de quien llama.
-- -----------------------------------------------------------------------------
create or replace function public.set_featured_campaign(p_campaign_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  update public.campaigns
     set is_featured = false
   where is_featured
     and id <> p_campaign_id;

  update public.campaigns
     set is_featured = true
   where id = p_campaign_id;

  if not found then
    raise exception 'La campaña no existe' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.set_featured_campaign(uuid) from public, anon;
grant execute on function public.set_featured_campaign(uuid) to authenticated;
