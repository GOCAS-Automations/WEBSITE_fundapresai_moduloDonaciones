-- Fase 3: texto alternativo (image_alt) para las imágenes de la portada (hero)
-- y de «Quiénes somos» (about). El panel lo exige cuando hay imagen
-- (lib/validations.ts); aquí solo se agrega la clave, vacía, a los datos que
-- ya existen. Es un cambio de forma, no de contenido: no se toca updated_at.

alter table public.site_settings disable trigger site_settings_set_updated_at;

update public.site_settings
set
  hero = case when hero ? 'image_alt' then hero else hero || jsonb_build_object('image_alt', null) end,
  about = case when about ? 'image_alt' then about else about || jsonb_build_object('image_alt', null) end
where id = 1
  and (not hero ? 'image_alt' or not about ? 'image_alt');

alter table public.site_settings enable trigger site_settings_set_updated_at;
