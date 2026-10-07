# Fundapresai · Sitio de donaciones

Landing de donaciones de la **Fundación Fundapresai** (Colegio de Valores Humanos Sathya Sai, Funza): presenta la fundación, muestra las campañas y lleva a donar en **Donar Online**. Incluye página por campaña y panel administrativo. No hay pasarela de pagos propia.

Hecho por GOCAS Automations. Plan maestro: `FREELANCE/Fundapresai/PLAN_INICIAL_FUNDAPRESAI.md`.

## Stack

- **Next.js 16.4** (App Router, Turbopack, **Cache Components** activo) · React 19 · TypeScript
- **Tailwind CSS 4** (tokens de marca con `@theme` en `app/globals.css`) · Poppins con `next/font`
- **Supabase** (Postgres + Auth + Storage, plan gratuito) · **Zod 4** · `lucide-react`
- **Vercel** Hobby

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # y completar los valores
npm run dev                  # http://localhost:3000
```

Node 22 o superior. `npm run build` y `npm run lint` deben pasar sin errores. El build no depende de que Supabase esté configurado: sin credenciales, las lecturas devuelven vacío.

## Variables de entorno

| Variable | Dónde | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + local | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + local | Clave pública (`anon` JWT o `sb_publishable_...`). El sitio funciona con ella + RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + local | Clave secreta (`service_role` o `sb_secret_...`). **Solo servidor**: en la app la usa únicamente `/api/heartbeat`; en local, los scripts |
| `NEXT_PUBLIC_SITE_URL` | Vercel + local | Dominio canónico, sin barra final |
| `NEXT_PUBLIC_ALLOW_INDEXING` | Vercel + local | `false` en la demo (todo con `noindex`); `true` solo con el subdominio definitivo |
| `CRON_SECRET` | Vercel + GitHub | Secreto del latido (largo y aleatorio) |
| `SUPABASE_DB_URL` | solo local | Postgres (Session pooler, puerto 5432) para `db:apply` |
| `SUPABASE_ACCESS_TOKEN` | solo local | Token personal `sbp_...` de la Management API (`db:types`, `auth:configure`) |

`.env.local` **nunca** va al repo (`.gitignore` lo excluye).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run db:apply` | Aplica las migraciones pendientes de `supabase/migrations/` (tabla de control `app_meta.schema_migrations`). `-- --dry-run` solo lista |
| `npm run db:seed` | Migraciones pendientes + `supabase/seed.sql` (idempotente: no pisa lo editado en el panel) |
| `npm run db:types` | Regenera `lib/supabase/database.types.ts` |
| `npm run seed:images` | Sube las portadas de `supabase/seed-images/` al bucket `media` y actualiza `cover_image_url` (`-- --force` reemplaza portadas propias) |
| `npm run auth:configure` | Registro desactivado, `site_url`, redirecciones y (si hay SMTP) correos en español. `-- --site-url https://...` al publicar |
| `npm run test:rls` | Prueba de seguridad con usuario anónimo (lectura, escritura, Storage, funciones) |
| `npm run backup` | Exporta `campaigns` y `site_settings` a `backups/` (ignorado por git) |
| `npm run covers:prepare` | Recorta las portadas originales a 16:10 |
| `npm run brand:assets` | Regenera logos, íconos y la portada provisional (requiere `pdftocairo`) |
| `npm run check:contrast` | Verifica el contraste WCAG de los tokens de color |

## Base de datos

Migraciones en `supabase/migrations/` (no se editan una vez aplicadas: se crea una nueva). Tablas `admins`, `site_settings` (fila única `id = 1`), `campaigns` y `heartbeat`, todas con RLS:

- `campaigns`: lectura pública solo de `status = 'active'`; todo lo demás solo administradores.
- `site_settings`: lectura pública; edición solo administradores.
- `admins`: cada usuario ve solo su fila; sin escritura por la API.
- `heartbeat`: sin acceso por la API; se escribe con `record_heartbeat()` (solo `service_role`).
- Storage `media`: público para leer por URL; subir, reemplazar y borrar solo administradores (5 MB; JPEG, PNG, WebP, AVIF).

### Crear un usuario administrador

El registro público está desactivado. En el dashboard de Supabase: **Authentication → Users → Add user** (correo y contraseña, marcando «Auto confirm»). Luego, en el **SQL Editor**:

```sql
insert into public.admins (user_id, name)
select id, 'Angela María Ramírez' from auth.users where email = 'correo@ejemplo.org';
```

**Correo de recuperación:** sin SMTP propio, Supabase solo envía correos a los miembros del equipo del proyecto y no deja traducir las plantillas. Para que «Olvidé mi contraseña» le llegue a Angela, configure un SMTP en **Authentication → SMTP Settings** (p. ej. Resend o Brevo, plan gratuito) y vuelva a correr `npm run auth:configure`.

## Latido de Supabase (heartbeat)

El plan gratuito pausa el proyecto tras 7 días sin actividad. Hay dos latidos independientes:

1. **Vercel Cron** diario (`vercel.json`) → `GET /api/heartbeat`. Vercel envía `CRON_SECRET` como `Authorization: Bearer`.
2. **GitHub Actions** cada 2 días (`.github/workflows/heartbeat.yml`), con secretos `CRON_SECRET` y `SITE_URL`.

El endpoint responde 401 sin el secreto y 200 con `{ ok, pinged_at, active_campaigns }`. Probarlo a mano:

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" "$SITE_URL/api/heartbeat?source=manual"
```

**Reactivar el workflow:** GitHub desactiva los workflows programados de repos sin commits en 60 días. Si pasa: **Actions → Latido de Supabase → Enable workflow** y luego **Run workflow**.

## Copias de seguridad

- **Semanal en GitHub** (`.github/workflows/backup.yml`, lunes, más `workflow_dispatch`): exporta a JSON y hace commit en la rama `backups` de este repo. Secretos: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. La rama `backups` no despliega en Vercel. **Si el repo es público, los respaldos también** (incluye campañas en borrador u ocultas).
- **Local:** `npm run backup`.
- **Restaurar** (upsert por clave primaria):

```bash
curl -X POST "$SUPABASE_URL/rest/v1/campaigns" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" \
  --data @data/campaigns.json
```

(Igual con `site_settings`. Con claves `sb_secret_...` se omite la cabecera `Authorization`.)

## Imágenes y logos

- **Logos:** Cesar indicó que el logo solo existe en JPEG, pero `Insumos/Identidad visual Fundapresai.pdf` trae el **logo vectorial** (exportado de Illustrator). `npm run brand:assets` lo renderiza a 1200 dpi con fondo transparente real (sin halos), corrige los colores a los hex del manual y genera `public/brand/` (horizontal, vertical, símbolo), `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png` y los íconos del manifest. Si la fundación entrega un SVG oficial, conviene reemplazarlos.
- **Portadas:** las de Donar Online no vienen en 16:10 y traen texto incrustado; `supabase/seed-images/` tiene recortes provisionales (originales en `originales/`). La de «Colegio de Valores Humanos» es una imagen con la paleta y el símbolo: **falta una foto real**. Se reemplazan desde el panel.
- **next/image:** solo se optimizan las imágenes del bucket de Supabase (`remotePatterns`). Las URL externas que se peguen en el panel se muestran con `unoptimized` (`lib/images.ts`), para no abrir un proxy de imágenes ni gastar la cuota de Vercel Hobby.

## Seguridad

Cabeceras en `next.config.ts`: CSP, HSTS, `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`; `X-Robots-Tag: noindex` en `/admin` y en todo el sitio mientras `NEXT_PUBLIC_ALLOW_INDEXING` no sea `true`. El Markdown se renderiza sin HTML crudo. Todo lo del panel se valida con Zod (`lib/validations.ts`) y, sobre todo, con RLS.

## Notas técnicas (Next 16)

- **Cache Components** está activo: las lecturas públicas (`lib/content.ts`) usan `"use cache"` + `cacheTag` + `cacheLife("max")`. El panel debe invalidar con `updateTag`/`revalidateTag(tag, "max")` y `revalidatePath`.
- Con Cache Components no existen `export const dynamic` ni `export const runtime`: `/api/heartbeat` es dinámico porque lee las cabeceras y corre en Node.js.
- El middleware se llama `proxy.ts` en Next 16 (se agrega en la fase 4 para el panel).

## Pendientes del cliente

- `TODO contacto`: teléfono, WhatsApp, correo, dirección y horario oficiales (hoy: 315 878 0973 y WhatsApp 320 878 4968, Funza; correo pendiente). Están en `site_settings.contact` y se editan desde el panel.
- Texto de «Quiénes somos» y relación Fundapresai ↔ colegio, validados por Angela.
- Política de privacidad base: validar con la fundación.
- Fotos propias (con autorización si aparecen estudiantes) y foto para «Colegio de Valores Humanos».
- SMTP para los correos de Auth.

## Subdominio (solo cuando el cliente acepte)

1. En Vercel: **Settings → Domains → Add** (p. ej. `donaciones.colsai.edu.co`).
2. En el DNS de la fundación: un registro `CNAME` hacia el destino que indique Vercel. **No tocar MX ni ningún otro registro.**
3. Actualizar `NEXT_PUBLIC_SITE_URL`, poner `NEXT_PUBLIC_ALLOW_INDEXING=true`, volver a desplegar y correr `npm run auth:configure -- --site-url https://donaciones...`.
4. Registrar el dominio en Google Search Console y enviar el sitemap.
