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

Node 22 o superior. `npm run build` y `npm run lint` deben pasar sin errores. El build no depende de que Supabase esté configurado: sin credenciales, las lecturas devuelven vacío. En un equipo con poca RAM: `NEXT_BUILD_CPUS=2 npm run build` (limita los trabajadores del build; además `memoryBasedWorkersCount` los ajusta a la memoria libre).

## Variables de entorno

| Variable | Dónde | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + local | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + local | Clave pública (`anon` JWT o `sb_publishable_...`). El sitio funciona con ella + RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + local | Clave secreta (`service_role` o `sb_secret_...`). **Solo servidor**: en la app la usan únicamente `/api/heartbeat` y la gestión de usuarios del panel (`lib/admin/accounts.ts`, siempre **después** de verificar con la sesión que quien llama es administrador general; ESLint impide importarla en otro archivo); en local, los scripts |
| `PASSWORD_RECOVERY_ENABLED` | opcional | **Apagada** si no existe. `true` reactiva «¿Olvidó su contraseña?» por correo (requiere SMTP; ver «Cuentas del panel»). Solo servidor; cambiarla exige volver a desplegar |
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
| `npm run auth:configure` | Registro desactivado, cuentas confirmadas sin correo (`mailer_autoconfirm`), contraseñas de 10+ caracteres, cambio de contraseña sin código por correo, `site_url`, redirecciones y (si hay SMTP) correos en español. Hoy: `-- --site-url https://fundapresai-donaciones.vercel.app` (las plantillas las rechaza la Management API sin SMTP propio: es esperado) |
| `npm run admin:super` | Crea (o confirma, sin duplicar ni cambiar la contraseña ni el nombre) la cuenta de **administrador general** de Cesar; la contraseña nueva (20 caracteres, sin ambiguos) va **solo** a `.credenciales-admin.local` (ignorado por git; el script lo verifica con `git check-ignore` y nunca la imprime). `-- --reset-password` le pone una nueva; `-- --email x --name "y"` para otra cuenta |
| `npm run test:rls` | Prueba de seguridad con usuario anónimo (lectura, escritura, Storage, funciones) |
| `npm run test:admin` | Prueba de punta a punta del panel contra `localhost` (con `npm run build && npm run start` corriendo): crea un admin y un usuario sin permisos **temporales**, prueba login, edición del hero, imagen sin descripción rechazada, CRUD de campañas con imagen subida y por URL (la reemplazada se borra del bucket), detalle de la campaña nueva, editar resumen y dirección (la vieja da 404), ocultar (404 y fuera del sitemap), eliminar con modal, reordenar, destacada, recuperación de contraseña (apagada: rutas al login) y RLS. **Fase 5**, con un administrador general temporal: crea un admin en «Usuarios» (contraseña generada, mostrada una vez y copiada), le restablece la contraseña, el admin entra con la nueva, no ve «Usuarios» y sus Server Actions de usuarios fallan (y RLS no le deja tocar `is_super`), cambia su contraseña en «Mi cuenta» (con la actual mala falla) y su nombre, y el administrador general le quita el acceso con el modal; la guarda «último administrador general» se prueba en una transacción deshecha. Capturas en `../Capturas/fase4/` y `../Capturas/fase5/` (Usuarios, Mi cuenta y login) y chequeos + axe. Nunca toca la cuenta real de Cesar. Al final borra todo lo de prueba y deja `campaigns` y `site_settings` idénticos al respaldo más reciente (`npm run backup` antes; `-- --backup <dir>` para elegir otro, `-- --no-shots` sin capturas). Requiere `SUPABASE_DB_URL` para restaurar `updated_at` |
| `npm run check:seo` | Contra `localhost` (con el sitio corriendo): title, description, canonical, Open Graph y Twitter con URL absolutas, imagen OG de 1200×630 en JPEG (la de marca < 300 KB) con width/height/type/alt, noindex según `NEXT_PUBLIC_ALLOW_INDEXING` y siempre en `/admin`, JSON-LD (WebSite, NGO con logo `ImageObject` PNG ≥ 112 px opaco, y WebPage + DonateAction), `sitemap.xml`, `robots.txt`, `favicon.ico` real con 16/32/48 px, `icon.png` múltiplo de 48, `apple-touch-icon` 180×180 opaco y manifest (192, 512 y maskable) |
| `npm run brand:share` | Regenera la imagen para redes `public/og/fundapresai.jpg` (HTML con Poppins fotografiado con Chrome), `public/brand/logo-google.png`, `app/favicon.ico`, `app/icon.png` y `app/apple-icon.png` desde el símbolo vectorial |
| `npm run backup` | Exporta `campaigns` y `site_settings` a `backups/` (ignorado por git) |
| `npm run covers:prepare` | Recorta las portadas originales a 16:10 |
| `npm run brand:assets` | Regenera logos, íconos y la portada provisional (requiere `pdftocairo`) |
| `npm run check:contrast` | Verifica el contraste WCAG de los tokens de color |
| `npm run shots` | Capturas de página completa (375 y 1440 px) en `../Capturas/fase2/` y chequeos: scroll horizontal (320–1440 px y zoom 200 %), un solo h1, texto ≥ 16 px, tocables ≥ 48 px y que la barra fija de «Donar» no tape el pie. `-- --axe` agrega axe-core; `-- --out <dir> --pages "nombre=/ruta,otra=/ruta2"` captura varias páginas en una corrida (en Git Bash, con `MSYS_NO_PATHCONV=1`). Con la barra fija, guarda además la primera pantalla (`-pantalla.png`). Solo contra `localhost`, con el Chrome instalado (`CHROME_PATH`) |

## Base de datos

Migraciones en `supabase/migrations/` (no se editan una vez aplicadas: se crea una nueva). Tablas `admins`, `site_settings` (fila única `id = 1`), `campaigns` y `heartbeat`, todas con RLS:

- `campaigns`: lectura pública solo de `status = 'active'`; todo lo demás solo administradores.
- `site_settings`: lectura pública; edición solo administradores.
- `admins`: cada usuario ve solo su fila; el **administrador general** (`is_super`) las ve todas. **Nadie escribe `admins` con la clave pública** (sin privilegios de escritura): las escrituras las hace el servidor con la clave secreta. `is_super` solo lo cambia `service_role` o SQL directo (trigger `admins_guard_is_super`), y un trigger impide quedarse sin administrador general (`admins_guard_last_super`, también ante el borrado en cascada desde Auth).
- `heartbeat`: sin acceso por la API; se escribe con `record_heartbeat()` (solo `service_role`).
- Storage `media`: público para leer por URL; subir, reemplazar y borrar solo administradores (5 MB; JPEG, PNG, WebP, AVIF).
- Funciones: `is_admin()` e `is_super_admin()` (`security definer`, `search_path` vacío; solo `authenticated` y `service_role`).

### Cuentas del panel: administrador general, sin correos

Decisión de Cesar (fase 5): **una cuenta de administrador general** (la suya) gestiona las demás desde el panel. **No hay SMTP**, así que Supabase no envía correos: ni de confirmación ni de recuperación.

- **Cuenta de Cesar:** `cesarxemiliox@gmail.com`, «Cesar Castaño · GOCAS», `is_super = true`. Se creó con `npm run admin:super`; la contraseña inicial está **solo** en `website/.credenciales-admin.local` (ignorado por git). Cámbiela en **Mi cuenta** al primer ingreso y borre el archivo.
- **Usuarios** (`/admin/usuarios`, solo el administrador general): listado (nombre, correo, insignia «Administrador general», creación y último ingreso), **crear administrador** (nombre, correo y contraseña, con «Generar contraseña segura»; la cuenta nace confirmada), **restablecer la contraseña** de otra cuenta, **editar nombre** y **quitar acceso** (borra el usuario de Auth y su fila en `admins`, con el modal propio). No puede quitarse a sí mismo ni quitar al último administrador general. Toda contraseña nueva se muestra **una sola vez** en el navegador de quien la creó, con «Copiar»; el servidor nunca la devuelve ni la guarda a la vista. Se entrega a la persona en privado.
- **Mi cuenta** (`/admin/cuenta`, todos los administradores; enlace en la barra superior): cambiar la contraseña pidiendo la actual (se verifica con `signInWithPassword` en un cliente aparte, sin tocar la sesión, y luego `updateUser`; mínimo 10 caracteres con letras y números) y cambiar su nombre. En celular, «Cerrar sesión» está aquí.
- **Si alguien olvida su contraseña:** el login dice «¿Olvidó su contraseña? Pídale al administrador general que se la restablezca.» y el administrador general lo hace en «Usuarios». Si Cesar olvida la suya: `npm run admin:super -- --reset-password` (en local, con la clave secreta) le asigna una aleatoria nueva y la escribe en `.credenciales-admin.local`; o la restablece otro administrador general.
- **Cómo se protege:** cada Server Action de usuarios llama primero a `requireSuperAdmin()` (`lib/admin/accounts.ts`): `is_admin()` + `is_super_admin()` **con la sesión del usuario y RLS**; solo entonces crea el cliente con la clave secreta y usa `auth.admin`. La página «Usuarios» hace lo mismo antes de listar. Un administrador normal no ve el mosaico y, si entra a la dirección, ve un aviso sin formularios; si fuerza la acción, el servidor responde «Solo el administrador general…». La prueba `npm run test:admin` lo verifica.
- **Otro administrador general:** por SQL, `update public.admins set is_super = true where user_id = '…';` (el panel no lo ofrece a propósito).

**Activar la recuperación por correo en el futuro** (el código sigue ahí, inactivo):

1. Configure un SMTP en **Supabase → Authentication → SMTP Settings** (p. ej. Resend o Brevo, plan gratuito).
2. Corra `npm run auth:configure -- --site-url https://<dominio>` para instalar las plantillas en español (con `token_hash`, funcionan en cualquier dispositivo).
3. En Vercel agregue `PASSWORD_RECOVERY_ENABLED=true` y vuelva a desplegar. Vuelven el enlace «¿Olvidó su contraseña?» del login, `/admin/recuperar`, `/admin/restablecer` y `/auth/confirm` (con la variable apagada, esas rutas redirigen al login y la acción de nueva contraseña se niega).
4. Corra `npm run test:admin` con el sitio arrancado con la variable: la prueba detecta que está activa y ejecuta el flujo completo de recuperación.

## Sitio público

| Ruta | Qué es |
|---|---|
| `/` | Landing (hero, campañas, cómo donar, quiénes somos, ayuda) |
| `/campanas/[slug]` | Detalle: «‹ Volver a campañas», portada, etiqueta, título, resumen y **Donar arriba**; texto (`body_md`) con tipografía de lectura (listas con el símbolo de la marca, numeradas en círculos); tarjeta con la nota de donación, la barra de avance y WhatsApp (fija al lado del texto en escritorio); ayuda y «Otras campañas» (2 o 3). En celular y tableta, **barra inferior fija** con «Donar» (`env(safe-area-inset-bottom)` y espacio de reserva para no tapar el pie ni el foco) |
| `/privacidad` | `privacy_md` con la misma tipografía de lectura |
| 404 | Página amable con las campañas activas, una por una, y el inicio. Campaña inexistente u oculta: `app/(public)/not-found.tsx` (dentro del layout); dirección inexistente: `app/not-found.tsx`. Responde **404** de verdad |
| `/og/fundapresai.jpg`, `/og/campanas/<slug>.jpg` | Imágenes para redes (ver SEO) |

**Caché del detalle:** `generateStaticParams` prerenderiza las campañas activas en el build (con etiquetas `campaigns` y `campaign:<slug>`). Una campaña nueva o con dirección cambiada se genera en la primera visita, sin redeploy, y queda guardada; el panel invalida con `revalidateCampaign()` (también la dirección anterior, que pasa a dar 404), así que ocultar una campaña la saca del detalle, de la landing y del sitemap al recargar. El layout público exporta `ensureStatic = "navigation"`: el build falla si una página pública llega a leer datos sin caché, cookies o cabeceras, y una dirección que no estaba en el build espera la página completa (por eso un slug inexistente responde 404 y no un esqueleto con 200).

## SEO

- **Metadata por página** (`lib/seo.ts` → `buildMetadata`): title, description, canonical, Open Graph y Twitter (`summary_large_image`), todo absoluto con `metadataBase` = `NEXT_PUBLIC_SITE_URL`. Landing: título, descripción e imagen de «Buscadores y redes». Campaña: `seo_title`/`seo_description` o, si están vacíos, `title`/`summary` (con « · Fundapresai»).
- **Imagen para redes de la landing:** la de «Buscadores y redes» o, si está vacía, la **imagen de marca estática** `public/og/fundapresai.jpg` (1200×630, JPEG de ~100 KB, URL absoluta y estable): tarjeta blanca con el logo vertical y el lema «Inspirando vidas en valores», el título del hero «¿Se siente inspirado? Su aporte transformará vidas.», fondo morado de la marca con el motivo de hojas y la franja rosa/periwinkle/terracota. Se regenera con `npm run brand:share`. Metas: `og:image` (+ `width`, `height`, `type`, `alt`), `og:site_name` «Fundapresai», `og:locale` `es_CO` y `twitter:card` `summary_large_image`. Copia para revisar en `../Capturas/fase5/og-landing-fundapresai.jpg`.
- **Imagen para redes de cada campaña:** `/og/campanas/<slug>.jpg?v=<versión>` (JPEG 1200×630): la portada **completa** (sin recortar, porque varias traen texto o el logo cerca del borde) sobre un fondo desenfocado de sí misma, con la insignia blanca del logo de Fundapresai abajo a la izquierda. Las portadas se suben en WebP y WhatsApp no siempre lo muestra; `v` cambia con cada edición para que WhatsApp no muestre una vieja. Se genera con `sharp` en una función `"use cache"` (`lib/og.ts`); los archivos de `public/` que usa van en `outputFileTracingIncludes` (`next.config.ts`).
- **noindex:** global (meta + cabecera `X-Robots-Tag`) mientras `NEXT_PUBLIC_ALLOW_INDEXING` no sea `true`; `/admin` siempre. **`robots.txt`:** `/admin` y `/api/` bloqueados; en la demo, todo bloqueado para buscadores, pero se permite a los lectores de vista previa (WhatsApp, Facebook, X, LinkedIn, Telegram, Slack) para que los enlaces compartidos muestren imagen y título (no indexan, y cada página sigue con noindex).
- **`sitemap.xml`** dinámico: landing, campañas **activas** (con su portada) y privacidad; se invalida con las mismas etiquetas.
- **JSON-LD:** en la landing, `WebSite` (`name` «Fundapresai», `alternateName` «Fundación Fundapresai», `url`, `inLanguage` `es-CO`: Google lo usa para el **nombre del sitio** en los resultados) y `NGO` (`name`, `alternateName`, `url`, **`logo` como `ImageObject`** → `public/brand/logo-google.png`, PNG 512×512 sobre blanco, contacto, dirección y `sameAs` de las redes); en cada campaña, `WebPage` con `potentialAction` `DonateAction` → `donation_url`. `npm run check:seo` lo valida.
- **Íconos** (en `app/`, Next los enlaza solo; `npm run brand:share` los genera desde el símbolo vectorial): `favicon.ico` con el **símbolo de Fundapresai** en 16, 32 y 48 px (el de 16 px con las puntas recortadas para que se lea), `icon.png` de 192×192 (Google exige un favicon cuadrado múltiplo de 48 px), `apple-icon.png` de 180×180 con **fondo blanco sólido** (iOS pone negro lo transparente) y `manifest.webmanifest` con íconos de 192 y 512 px y uno `maskable` (símbolo dentro de la zona segura), `theme_color` `#5f2c85` y `background_color`. Vista ampliada en `../Capturas/fase5/favicon-ampliado.png`.
- **Lighthouse móvil** (localhost, build con `NEXT_PUBLIC_ALLOW_INDEXING=true`, 2026-10-07): `/` 92 · 100 · 100 · 100 y `/campanas/unidos-por-su-educacion` 94 · 100 · 100 · 100 (rendimiento · accesibilidad · buenas prácticas · SEO). Para medir SEO sin el noindex de la demo: `NEXT_PUBLIC_ALLOW_INDEXING=true npm run build` y `NEXT_PUBLIC_ALLOW_INDEXING=true npm run start` (la cabecera se calcula al arrancar), sin editar `.env.local`; luego volver a compilar normal.

## Panel administrativo (`/admin`)

| Ruta | Qué hace |
|---|---|
| `/admin/login` | Entrar con correo y contraseña (página estática; `?next=` vuelve a la ruta pedida). Sin recuperación por correo: «Pídale al administrador general que se la restablezca» |
| `/admin/recuperar` | **Inactiva** (redirige al login) salvo `PASSWORD_RECOVERY_ENABLED=true`: «¿Olvidó su contraseña?» con `resetPasswordForEmail` desde el navegador |
| `/auth/confirm` | **Inactiva** igual. Route handler de los enlaces de Auth: `token_hash` + `verifyOtp` (plantillas propias) o `code` + `exchangeCodeForSession` (PKCE, plantilla por defecto) |
| `/admin/restablecer` | **Inactiva** igual. Definir la nueva contraseña (con la sesión que abre el enlace) |
| `/admin` | Inicio: «Editar sitio», «Campañas», «Usuarios» (solo administrador general), «Mi cuenta», «Ver sitio» y estado del latido (aviso ámbar si pasan más de 72 h) |
| `/admin/usuarios` | Solo administrador general: cuentas del panel (ver «Cuentas del panel») |
| `/admin/cuenta` | Mi cuenta: contraseña (pide la actual) y nombre |
| `/admin/contenido` | Un formulario por bloque de `site_settings`, cada uno con su «Guardar» |
| `/admin/campanas`, `/nueva`, `/[id]/editar` | Listado (ordenar ↑ ↓, ocultar/mostrar, eliminar con modal), crear y editar |

**Protección doble:** `proxy.ts` refresca la sesión (`@supabase/ssr`) y manda a `/admin/login` si no hay sesión (login, recuperar y restablecer quedan libres; las dos últimas van al login mientras la recuperación esté apagada). Además, el layout del panel y **cada Server Action** verifican en el servidor `is_admin()` (`requireAdmin()` en `lib/supabase/server.ts`); un usuario autenticado que no esté en `admins` ve un aviso amable y ningún formulario, y RLS le bloquea cualquier escritura igual. Las acciones revalidan el sitio con `lib/revalidate.ts`, así que los cambios se ven en `/` al recargar.

**Recuperar contraseña (inactivo sin `PASSWORD_RECOVERY_ENABLED=true`):** el formulario pide el correo desde el navegador (así queda la cookie PKCE) con `redirectTo = <origen>/auth/confirm?next=/admin/restablecer`. Con la plantilla por defecto de Supabase el enlace trae `?code=` y **solo funciona en el mismo navegador** donde se pidió (si no, se le pide uno nuevo con ese aviso). Con SMTP propio, `npm run auth:configure` instala plantillas en español con `token_hash`, que funcionan en cualquier dispositivo. El flujo `token_hash` está probado de punta a punta (`npm run test:admin`).

**Estados de campaña:** Activa (se ve), Borrador y Oculta (no se ven). «Publicar» o «Mostrar» desde el listado exige que la campaña esté completa (mismo esquema Zod). La destacada es una sola: `set_featured_campaign()` desmarca las demás en una transacción. En `/` la destacada siempre va primero; el resto sigue el orden del listado.

### Imágenes del panel

Todo campo de imagen (portadas, hero, «Quiénes somos» e imagen para redes) tiene dos pestañas:

- **Subir imagen** (computador o celular): el navegador reduce la foto a ~2000 px de lado mayor y la comprime a **WebP** (calidad 0,82; JPEG si el navegador no sabe crear WebP), así una foto de celular de 5–10 MB queda en unos cientos de KB, por debajo del límite de 5 MB del bucket. La imagen para redes sociales va en **JPEG de 1200 px** (WhatsApp y Facebook la leen mejor). Se sube al bucket `media` con nombre único: `campanas/<slug>-<timestamp>.webp` o `sitio/<bloque>-<timestamp>.webp`. Las fotos HEIC solo se leen si el navegador las soporta (Safari en iPhone las convierte solo).
- **Pegar enlace:** solo `https://`, y el panel **comprueba que la URL cargue una imagen** en el navegador antes de dejar guardar. Los enlaces de compartir de **Google Drive** (`/file/d/<id>/view`, `open?id=`, `uc?id=`) se convierten a `https://lh3.googleusercontent.com/d/<id>=w2000`. Probado el 2026-10-07: `uc?export=view` y `drive.usercontent.google.com` ya no sirven dentro de una página (Google responde 403 a peticiones de imagen y Chrome lo bloquea con ORB); `lh3` sí carga si el archivo está compartido como «Cualquier persona con el enlace», aunque Google lo limita (429) ante muchas visitas seguidas. Por eso el panel recomienda «Subir imagen» para fotos importantes. Las carpetas de Drive y los enlaces de Google Fotos se rechazan con un aviso.
- **next/image y CSP (sin cambios en `next.config.ts`):** las imágenes del bucket se optimizan (`remotePatterns`); las externas (Drive, otras nubes) se muestran con `unoptimized` (`lib/images.ts`) y las carga el navegador directo, lo que la CSP ya permite (`img-src https: data: blob:`). Se descartó `remotePatterns` con `**`: abriría `/_next/image` como proxy para cualquier dominio y gastaría la cuota de optimización de Vercel Hobby.
- **Imágenes huérfanas:** al reemplazar o quitar una imagen (portada, hero, «Quiénes somos», redes) o al eliminar una campaña, la Server Action borra la anterior del bucket `media` **solo si** es de nuestro bucket y ya no la usa ninguna campaña (activa, borrador u oculta) ni ningún bloque del sitio (`lib/admin/media-cleanup.ts`, con el cliente del administrador y RLS). Si la limpieza falla, se registra y el guardado sigue bien. Las URL externas (Drive, otras nubes) nunca se tocan. Lo que no se limpia: fotos subidas en un formulario que luego no se guardó; si algún día el bucket se acerca al 1 GB del plan gratuito, se revisan a mano en Storage.
- **Texto alternativo:** la portada de cada campaña, la imagen del hero y la de «Quiénes somos» llevan su descripción (`cover_image_alt` e `image_alt`), obligatoria al guardar si hay imagen. Las imágenes puramente decorativas del sitio (miniaturas junto a un título que ya las nombra, el símbolo de fondo) usan `alt=""` a propósito.

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

- **Logos:** Cesar indicó que el logo solo existe en JPEG, pero `Insumos/Identidad visual Fundapresai.pdf` trae el **logo vectorial** (exportado de Illustrator). `npm run brand:assets` lo renderiza a 1200 dpi con fondo transparente real (sin halos), corrige los colores a los hex del manual y genera `public/brand/` (horizontal, vertical, símbolo) y los íconos del manifest; `npm run brand:share` genera el favicon, `icon.png`, `apple-icon.png`, el logo para Google y la imagen para redes. Si la fundación entrega un SVG oficial, conviene reemplazarlos.
- **Portadas:** las de Donar Online no vienen en 16:10 y traen texto incrustado; `supabase/seed-images/` tiene recortes provisionales (originales en `originales/`). La de «Colegio de Valores Humanos» es una imagen con la paleta y el símbolo: **falta una foto real**. Se reemplazan desde el panel.
- **next/image:** solo se optimizan las imágenes del bucket de Supabase (`remotePatterns`). Las URL externas que se peguen en el panel se muestran con `unoptimized` (`lib/images.ts`), para no abrir un proxy de imágenes ni gastar la cuota de Vercel Hobby (ver «Imágenes del panel»).
- **Hero y «Quiénes somos»:** la foto de «Quiénes somos» aparece a lo ancho sobre la tarjeta morada. La imagen del hero se muestra **solo si no hay una campaña destacada**, es decir, si no hay ninguna campaña activa (el diseño aprobado usa la campaña destacada); el panel lo explica junto al campo y dice si hoy se está mostrando o no. Ambas llevan descripción (`image_alt`, migración `20261007200000_texto_alternativo_imagenes.sql`); sin ella (datos anteriores) se tratan como decorativas.

## Seguridad

Cabeceras en `next.config.ts`: CSP, HSTS, `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`; `X-Robots-Tag: noindex` en `/admin` y en todo el sitio mientras `NEXT_PUBLIC_ALLOW_INDEXING` no sea `true`. El Markdown se renderiza sin HTML crudo. Todo lo del panel se valida con Zod (`lib/validations.ts`) y, sobre todo, con RLS.

## Notas técnicas (Next 16)

- **Cache Components** está activo: las lecturas públicas (`lib/content.ts`) usan `"use cache"` + `cacheTag` + `cacheLife("max")`. El panel debe invalidar con `updateTag`/`revalidateTag(tag, "max")` y `revalidatePath`.
- Con Cache Components no existen `export const dynamic` ni `export const runtime`: `/api/heartbeat` es dinámico porque lee las cabeceras y corre en Node.js.
- `generateStaticParams` debe devolver al menos un parámetro: sin campañas (o sin Supabase en el build) devuelve uno de relleno que da 404.
- Un `notFound()` lanzado en una página de `(public)` lo atrapa `app/(public)/not-found.tsx`; las direcciones que no existen, `app/not-found.tsx` (fuera del layout, por eso trae `SiteFrame`).
- El middleware se llama `proxy.ts` en Next 16 (solo corre en `/admin`; las páginas públicas siguen estáticas).
- Todo lo que lee la sesión en el panel va dentro de `<Suspense>` (regla de Cache Components); `/admin/login` es estática y lee `?next=` en el navegador.
- Los formularios del panel se envían con `onSubmit` + `startTransition` en vez de `<form action>`: React 19 vacía los campos no controlados después de una acción, y Angela perdería lo escrito si hay un error.

## Pendientes del cliente

- `TODO contacto`: teléfono, WhatsApp, correo, dirección y horario oficiales (hoy: 315 878 0973 y WhatsApp 320 878 4968, Funza; correo pendiente). Están en `site_settings.contact` y se editan desde el panel.
- Texto de «Quiénes somos» y relación Fundapresai ↔ colegio, validados por Angela.
- Política de privacidad base: validar con la fundación.
- Fotos propias (con autorización si aparecen estudiantes) y foto para «Colegio de Valores Humanos».
- SMTP para los correos de Auth (opcional: hoy el administrador general gestiona las contraseñas; ver «Activar la recuperación por correo»).

## Subdominio (solo cuando el cliente acepte)

1. En Vercel: **Settings → Domains → Add** (p. ej. `donaciones.colsai.edu.co`).
2. En el DNS de la fundación: un registro `CNAME` hacia el destino que indique Vercel. **No tocar MX ni ningún otro registro.**
3. Actualizar `NEXT_PUBLIC_SITE_URL`, poner `NEXT_PUBLIC_ALLOW_INDEXING=true`, volver a desplegar y correr `npm run auth:configure -- --site-url https://donaciones...`.
4. Registrar el dominio en Google Search Console y enviar el sitemap.
