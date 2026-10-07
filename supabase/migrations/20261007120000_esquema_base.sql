-- =============================================================================
-- Fundapresai · Esquema base
-- Tablas: admins, site_settings (fila única id = 1), campaigns, heartbeat.
-- =============================================================================

-- Estado de una campaña: solo «active» es público.
create type public.campaign_status as enum ('draft', 'active', 'hidden');

-- -----------------------------------------------------------------------------
-- Trigger genérico para updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- admins: usuarios de Supabase Auth que pueden entrar al panel.
-- No hay registro público: Cesar crea el usuario en Auth y lo agrega aquí.
-- -----------------------------------------------------------------------------
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '' check (char_length(name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.admins is 'Usuarios con acceso al panel /admin. Todos son administradores.';

create trigger admins_set_updated_at
  before update on public.admins
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- site_settings: contenido editable del sitio. Una sola fila (id = 1).
-- La forma de cada bloque jsonb se valida con Zod en lib/validations.ts.
-- -----------------------------------------------------------------------------
create table public.site_settings (
  id            smallint primary key default 1 check (id = 1),
  hero          jsonb not null default '{}'::jsonb check (jsonb_typeof(hero) = 'object'),
  about         jsonb not null default '{}'::jsonb check (jsonb_typeof(about) = 'object'),
  how_to_donate jsonb not null default '{}'::jsonb check (jsonb_typeof(how_to_donate) = 'object'),
  help          jsonb not null default '{}'::jsonb check (jsonb_typeof(help) = 'object'),
  contact       jsonb not null default '{}'::jsonb check (jsonb_typeof(contact) = 'object'),
  socials       jsonb not null default '{}'::jsonb check (jsonb_typeof(socials) = 'object'),
  seo           jsonb not null default '{}'::jsonb check (jsonb_typeof(seo) = 'object'),
  privacy_md    text  not null default '' check (char_length(privacy_md) <= 50000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.site_settings is 'Contenido del sitio público. Fila única id = 1.';

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- campaigns
-- -----------------------------------------------------------------------------
create table public.campaigns (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique
                   check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title            text not null check (char_length(btrim(title)) between 1 and 80),
  tag              text check (tag is null or char_length(tag) <= 40),
  summary          text not null check (char_length(btrim(summary)) between 1 and 160),
  body_md          text not null default '' check (char_length(body_md) <= 20000),
  -- Requerida por el panel (Zod). Puede ser null solo mientras el script de
  -- portadas (scripts/seed-images.ts) no ha corrido.
  cover_image_url  text check (cover_image_url is null or cover_image_url ~ '^https://'),
  cover_image_alt  text not null default '' check (char_length(cover_image_alt) <= 200),
  donation_url     text not null check (donation_url ~ '^https://'),
  donation_note    text check (donation_note is null or char_length(donation_note) <= 200),
  progress_percent integer check (progress_percent is null or progress_percent between 0 and 100),
  status           public.campaign_status not null default 'draft',
  is_featured      boolean not null default false,
  sort_order       integer not null default 0,
  seo_title        text check (seo_title is null or char_length(seo_title) <= 70),
  seo_description  text check (seo_description is null or char_length(seo_description) <= 170),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.campaigns is 'Campañas de donación. Solo status = active es público.';
comment on column public.campaigns.donation_url is 'Enlace de Donar Online (https). El panel advierte si no es de donaronline.org.';

-- Una sola campaña destacada a la vez (lo garantiza la base, no solo la interfaz).
create unique index campaigns_single_featured_idx
  on public.campaigns (is_featured)
  where is_featured;

-- Listado público: activas ordenadas.
create index campaigns_status_sort_idx
  on public.campaigns (status, sort_order, created_at);

create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- heartbeat: latidos para que Supabase Free no pause el proyecto (plan §10.1).
-- Sin acceso público; solo se escribe con record_heartbeat() desde el servidor.
-- -----------------------------------------------------------------------------
create table public.heartbeat (
  id        bigint generated always as identity primary key,
  source    text not null check (source in ('vercel-cron', 'github-action', 'manual')),
  pinged_at timestamptz not null default now()
);

comment on table public.heartbeat is 'Latidos diarios (Vercel Cron + GitHub Actions). Se conservan 30 días.';

create index heartbeat_pinged_at_idx on public.heartbeat (pinged_at desc);
