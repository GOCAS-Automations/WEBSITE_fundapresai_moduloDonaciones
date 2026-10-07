-- =============================================================================
-- Fundapresai · Latido (heartbeat) de Supabase · plan §10.1
-- =============================================================================

-- -----------------------------------------------------------------------------
-- record_heartbeat(source): escritura + lectura reales en Postgres.
--   1. Inserta un latido con su origen (validado contra la lista permitida).
--   2. Borra los latidos de más de 30 días.
--   3. Devuelve la hora del latido y el conteo de campañas activas.
-- Solo service_role puede ejecutarla (la llama /api/heartbeat en el servidor).
-- -----------------------------------------------------------------------------
create or replace function public.record_heartbeat(source text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_source    text := btrim(coalesce(record_heartbeat.source, ''));
  v_pinged_at timestamptz;
  v_active    integer;
begin
  if v_source not in ('vercel-cron', 'github-action', 'manual') then
    raise exception 'Origen de latido no permitido: %', v_source
      using errcode = '22023';
  end if;

  insert into public.heartbeat as h (source)
  values (v_source)
  returning h.pinged_at into v_pinged_at;

  delete from public.heartbeat h
   where h.pinged_at < now() - interval '30 days';

  select count(*)::integer
    into v_active
    from public.campaigns c
   where c.status = 'active';

  return jsonb_build_object(
    'pinged_at', v_pinged_at,
    'active_campaigns', v_active
  );
end;
$$;

revoke execute on function public.record_heartbeat(text) from public, anon, authenticated;
grant execute on function public.record_heartbeat(text) to service_role;

-- -----------------------------------------------------------------------------
-- last_heartbeat(): hora del último latido, para el inicio del panel.
-- Solo administradores (la tabla heartbeat no tiene políticas de lectura).
-- -----------------------------------------------------------------------------
create or replace function public.last_heartbeat()
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  return (select max(h.pinged_at) from public.heartbeat h);
end;
$$;

revoke execute on function public.last_heartbeat() from public, anon;
grant execute on function public.last_heartbeat() to authenticated;
