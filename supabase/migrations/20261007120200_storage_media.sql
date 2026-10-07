-- =============================================================================
-- Fundapresai · Storage: bucket público «media»
-- Lectura pública por URL; subir, reemplazar y borrar solo administradores.
-- Máximo 5 MB; solo JPEG, PNG, WebP y AVIF.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- La lectura de un bucket público va por la URL pública y no necesita política.
-- No se crea política SELECT para anon: así nadie puede LISTAR el bucket.
-- Los administradores sí pueden listar (lo necesita el panel y el upsert).

create policy "media: admins listan"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));

create policy "media: admins suben"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy "media: admins reemplazan"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy "media: admins borran"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
