-- =============================================================================
-- Fundapresai · Administrador general y gestión de usuarios desde el panel
-- =============================================================================
-- Decisión de Cesar (fase 5): una cuenta de «administrador general» gestiona
-- las demás desde /admin/usuarios (crear, restablecer contraseña, editar
-- nombre y quitar acceso). No hay SMTP: nadie recibe correos de Auth.
--
-- Reglas:
-- * admins.is_super marca al administrador general.
-- * El administrador general lee todas las filas de `admins`; los demás, solo
--   la suya (política de 20261007120100).
-- * Nadie escribe `admins` por la API con la clave pública: las escrituras
--   (y las de auth.users) las hace el SERVIDOR con la clave secreta, después
--   de verificar con la sesión que quien llama es administrador general
--   (lib/admin/accounts.ts).
-- * is_super solo lo cambia service_role o SQL directo (trigger de guarda).
-- * Nunca puede quedar el panel sin administrador general (trigger).
-- =============================================================================

alter table public.admins
  add column is_super boolean not null default false;

comment on column public.admins.is_super is
  'Administrador general: gestiona las cuentas del panel en /admin/usuarios. Solo se cambia desde el servidor (service_role) o por SQL.';

-- -----------------------------------------------------------------------------
-- is_super_admin(): true si el usuario autenticado es administrador general.
-- Igual que is_admin(): security definer (lee admins sin depender de RLS) y
-- search_path vacío.
-- -----------------------------------------------------------------------------
create or replace function public.is_super_admin()
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
      and a.is_super
  );
$$;

revoke execute on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- RLS: el administrador general lee todas las filas (para el listado de
-- usuarios). La política «admins: lectura propia» sigue vigente para todos.
-- -----------------------------------------------------------------------------
create policy "admins: el administrador general lee todo"
  on public.admins
  for select
  to authenticated
  using ((select public.is_super_admin()));

-- -----------------------------------------------------------------------------
-- Privilegios: ya se revocaron en 20261007120100 (solo SELECT para
-- authenticated); se repite explícito porque ahora la tabla tiene un campo
-- sensible. Sin INSERT/UPDATE/DELETE no hace falta ninguna política de
-- escritura: con la clave pública nadie puede escribir `admins`.
-- -----------------------------------------------------------------------------
revoke insert, update, delete, truncate, references, trigger on public.admins from anon, authenticated;
revoke all on public.admins from anon;

-- -----------------------------------------------------------------------------
-- Guarda 1: solo service_role (servidor) o un rol de base de datos (SQL
-- Editor, migraciones) puede crear un administrador general o cambiar
-- is_super. Defensa en profundidad por si algún día se concede escritura.
-- security invoker: current_user es el rol que ejecuta la sentencia
-- (PostgREST hace SET ROLE anon/authenticated/service_role).
-- -----------------------------------------------------------------------------
create or replace function public.guard_admins_is_super()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  if (tg_op = 'INSERT' and new.is_super)
     or (tg_op = 'UPDATE' and new.is_super is distinct from old.is_super) then
    raise exception 'Solo el servidor puede asignar el rol de administrador general'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger admins_guard_is_super
  before insert or update of is_super on public.admins
  for each row execute function public.guard_admins_is_super();

-- -----------------------------------------------------------------------------
-- Guarda 2: nunca se queda el panel sin administrador general. AFTER ROW: la
-- consulta ve el estado final de la sentencia (sirve también para borrados
-- de varias filas y para el borrado en cascada desde auth.users).
-- -----------------------------------------------------------------------------
create or replace function public.guard_last_super_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_super and not exists (select 1 from public.admins a where a.is_super) then
    raise exception 'No se puede quitar al último administrador general'
      using errcode = 'P0001';
  end if;
  return null;
end;
$$;

revoke execute on function public.guard_last_super_admin() from public, anon, authenticated;
revoke execute on function public.guard_admins_is_super() from public, anon, authenticated;

create trigger admins_guard_last_super
  after delete or update of is_super on public.admins
  for each row execute function public.guard_last_super_admin();

comment on table public.admins is
  'Usuarios con acceso al panel /admin. is_super = administrador general (gestiona las cuentas). Se escribe solo desde el servidor.';
