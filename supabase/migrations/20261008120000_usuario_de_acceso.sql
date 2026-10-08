-- =============================================================================
-- Fundapresai · Cuentas del panel con USUARIO en vez de correo (fase 6)
-- =============================================================================
-- Decisión de Cesar: se entra al panel con un usuario («admin», «angela»).
-- Supabase Auth exige un correo, así que cada cuenta usa uno interno y
-- determinista, <usuario>@fundapresai.invalid (dominio reservado que nunca
-- recibe correos; ver lib/admin/username.ts). El usuario se guarda aquí, único
-- y en minúsculas, y el servidor lo mantiene igual al correo interno de Auth.
--
-- Cuentas existentes: el usuario sale de la parte del correo antes de la @
-- (saneada). La de Cesar se pasa después a «admin», con su correo interno,
-- con `npm run admin:super` (idempotente; no cambia la contraseña).
-- =============================================================================

alter table public.admins
  add column username text;

with derived as (
  select a.user_id,
         left(regexp_replace(lower(split_part(coalesce(u.email, ''), '@', 1)), '[^a-z0-9._-]', '', 'g'), 30) as base
  from public.admins a
  left join auth.users u on u.id = a.user_id
)
update public.admins a
set username = case
    when d.base ~ '^[a-z0-9][a-z0-9._-]{2,29}$' then d.base
    else 'cuenta-' || left(a.user_id::text, 8)
  end
from derived d
where d.user_id = a.user_id;

alter table public.admins
  alter column username set not null,
  add constraint admins_username_formato check (username ~ '^[a-z0-9][a-z0-9._-]{2,29}$'),
  add constraint admins_username_unico unique (username);

comment on column public.admins.username is
  'Usuario para entrar al panel (único, en minúsculas). El correo de Auth es <usuario>@fundapresai.invalid; el servidor cambia los dos juntos.';
