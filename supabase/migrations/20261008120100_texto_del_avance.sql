-- =============================================================================
-- Fundapresai · Texto que acompaña al porcentaje de avance (fase 6)
-- =============================================================================
-- El avance no es un dato en vivo: lo escribe la fundación en el panel. Para
-- que no lo parezca, cada campaña puede decir qué mide su porcentaje
-- («de las becas ya están cubiertas»). Vacío → el sitio muestra «de la meta».
-- =============================================================================

alter table public.campaigns
  add column progress_label text
    check (progress_label is null or (char_length(progress_label) between 1 and 60));

comment on column public.campaigns.progress_label is
  'Texto opcional (máx. 60) que acompaña al porcentaje de avance. Vacío: «de la meta».';

-- «Unidos por su Educación»: el 85 % sale del texto que la fundación publicó
-- en Donar Online («ya hemos logrado cubrir el 85 % de sus becas»). Solo si
-- aún no tiene texto, y sin tocar updated_at (no es una edición del panel).
alter table public.campaigns disable trigger campaigns_set_updated_at;

update public.campaigns
set progress_label = 'de las becas ya están cubiertas'
where slug = 'unidos-por-su-educacion'
  and progress_label is null;

alter table public.campaigns enable trigger campaigns_set_updated_at;
