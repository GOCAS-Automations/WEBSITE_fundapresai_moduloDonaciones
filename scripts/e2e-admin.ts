/**
 * Prueba de punta a punta del panel (fase 4) y de su efecto en el sitio
 * público (fase 3: detalle de campaña, 404 y sitemap) contra el sitio LOCAL.
 *
 * Uso:  npm run build && npm run start   (en otra terminal)
 *       npm run test:admin [-- --backup backups/AAAA-MM-DD_HHMM] [-- --no-shots]
 *
 * 1. Crea con la clave secreta dos usuarios TEMPORALES (contraseñas aleatorias
 *    en memoria): uno administrador (en `admins`) y otro autenticado sin permisos.
 * 2. Prueba: redirección sin sesión, login, editar el hero y verlo en `/`,
 *    crear una campaña con imagen subida y luego con imagen por URL (y Drive),
 *    ver su detalle, editar el resumen y la dirección (detalle, 404 y sitemap),
 *    ocultarla (404 y fuera del sitemap), borrarla con el modal, reordenar,
 *    que la imagen reemplazada se borre del bucket, cambiar la destacada,
 *    recuperación de contraseña (token_hash) y que el usuario sin permisos no
 *    pueda guardar nada (ni por el panel ni por la API).
 * 3. Capturas a 375 y 1440 px en ../Capturas/fase4 y chequeos de accesibilidad.
 * 4. SIEMPRE (finally): borra usuarios, campañas e imágenes de prueba, restaura
 *    campaigns y site_settings tal como estaban (incluido updated_at) y los
 *    compara con el respaldo JSON (--backup, o el más reciente de backups/).
 */
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import sharp from "sharp";

import type { Database } from "../lib/supabase/database.types";
import { assertLocalhost, CHROME, fullPageShot, runAxe, runChecks, settle } from "./lib/browser";
import { pgClientConfig } from "./lib/db";
import { loadLocalEnv, requireEnv, ROOT } from "./lib/env";

loadLocalEnv();

const BASE = "http://localhost:3000";
assertLocalhost(BASE);
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const SHOTS = !process.argv.includes("--no-shots");
const OUT = path.resolve(ROOT, "..", "Capturas", "fase4");

const SB_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");
const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const service = createClient<Database>(SB_URL, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), opts);
const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const EXTERNAL_IMAGE = "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1600&q=80";
const DRIVE_SHARE = "https://drive.google.com/file/d/18onwpszLRsc62P92f7biat6ORbXtL7u4/view?usp=sharing";
const TEST_PREFIX = "prueba-e2e";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type SettingsRow = Database["public"]["Tables"]["site_settings"]["Row"];

// -----------------------------------------------------------------------------
// Registro de resultados
// -----------------------------------------------------------------------------

const results: { name: string; ok: boolean; detail?: string }[] = [];
function check(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "OK  " : "FALLA"} ${name}${detail ? ` — ${detail}` : ""}`);
}
async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const waiting = msg.split("\n").find((l) => l.includes("waiting for"))?.trim();
    check(name, false, [msg.split("\n")[0], waiting].filter(Boolean).join(" · "));
  }
}

const sortKeys = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(sortKeys)
    : v && typeof v === "object"
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sortKeys(x)]))
      : v;
const same = (a: unknown, b: unknown) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));

// -----------------------------------------------------------------------------
// Datos
// -----------------------------------------------------------------------------

async function readCampaigns(): Promise<CampaignRow[]> {
  const { data, error } = await service.from("campaigns").select("*").order("sort_order").order("created_at");
  if (error) throw error;
  return data;
}
async function readSettings(): Promise<SettingsRow> {
  const { data, error } = await service.from("site_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}
async function listMedia(): Promise<string[]> {
  const out: string[] = [];
  for (const folder of ["campanas", "sitio"]) {
    const { data } = await service.storage.from("media").list(folder, { limit: 1000 });
    for (const f of data ?? []) if (f.id) out.push(`${folder}/${f.name}`);
  }
  return out;
}

function latestBackupDir(): string {
  const explicit = arg("backup");
  if (explicit) return path.resolve(ROOT, explicit);
  const dir = path.join(ROOT, "backups");
  const all = existsSync(dir) ? readdirSync(dir).filter((d) => /^\d{4}-\d{2}-\d{2}_\d{4}$/.test(d)).sort() : [];
  if (!all.length) throw new Error("No hay respaldo: corra antes `npm run backup`.");
  return path.join(dir, all[all.length - 1]);
}

/** Restaura filas exactas (incluido updated_at, que el trigger pisaría) con SQL directo. */
async function restoreExact(campaigns: CampaignRow[], settings: SettingsRow) {
  const pg = new Client(pgClientConfig("fundapresai-e2e-restore"));
  await pg.connect();
  try {
    await pg.query("begin");
    await pg.query("alter table public.campaigns disable trigger campaigns_set_updated_at");
    await pg.query("alter table public.site_settings disable trigger site_settings_set_updated_at");
    // Primero se desmarca la destacada (índice único parcial) y luego se escribe todo.
    await pg.query("update public.campaigns set is_featured = false where is_featured");
    for (const c of campaigns) {
      await pg.query(
        `update public.campaigns set slug=$2, title=$3, tag=$4, summary=$5, body_md=$6, cover_image_url=$7,
           cover_image_alt=$8, donation_url=$9, donation_note=$10, progress_percent=$11, status=$12::public.campaign_status,
           is_featured=$13, sort_order=$14, seo_title=$15, seo_description=$16, created_at=$17, updated_at=$18
         where id=$1`,
        [c.id, c.slug, c.title, c.tag, c.summary, c.body_md, c.cover_image_url, c.cover_image_alt, c.donation_url,
          c.donation_note, c.progress_percent, c.status, c.is_featured, c.sort_order, c.seo_title, c.seo_description,
          c.created_at, c.updated_at],
      );
    }
    const s = settings;
    await pg.query(
      `update public.site_settings set hero=$1, about=$2, how_to_donate=$3, help=$4, contact=$5, socials=$6, seo=$7,
         privacy_md=$8, created_at=$9, updated_at=$10 where id=1`,
      [s.hero, s.about, s.how_to_donate, s.help, s.contact, s.socials, s.seo, s.privacy_md, s.created_at, s.updated_at].map(
        (v) => (v !== null && typeof v === "object" ? JSON.stringify(v) : v),
      ),
    );
    await pg.query("alter table public.campaigns enable trigger campaigns_set_updated_at");
    await pg.query("alter table public.site_settings enable trigger site_settings_set_updated_at");
    await pg.query("commit");
  } catch (err) {
    await pg.query("rollback").catch(() => {});
    throw err;
  } finally {
    await pg.end();
  }
}

// -----------------------------------------------------------------------------
// Navegador
// -----------------------------------------------------------------------------

const consoleErrors: string[] = [];

async function newContext(browser: Browser, width = 1440, scale = 1): Promise<BrowserContext> {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 768 ? 812 : 900 },
    deviceScaleFactor: scale,
    locale: "es-CO",
    baseURL: BASE,
  });
  await ctx.addInitScript("window.__name = (f) => f;");
  ctx.on("page", (p) => watch(p));
  return ctx;
}
function watch(page: Page) {
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(`${page.url().replace(BASE, "")}: ${m.text().slice(0, 200)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`${page.url().replace(BASE, "")}: ${e.message.slice(0, 200)}`));
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/** Texto de la landing pública (sin caché del navegador). */
async function publicText(ctx: BrowserContext, selector = "main"): Promise<string> {
  const page = await ctx.newPage();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const text = await page.locator(selector).innerText();
  await page.close();
  return text.replace(/\s+/g, " ");
}
async function publicCampaignTitles(ctx: BrowserContext): Promise<string[]> {
  const page = await ctx.newPage();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const titles = await page.locator("#campanas h3").allInnerTexts();
  await page.close();
  return titles.map((t) => t.trim());
}

/** GET al sitio público (sin navegador): estado y cuerpo. */
async function fetchPublic(pathname: string): Promise<{ status: number; body: string; type: string }> {
  const res = await fetch(`${BASE}${pathname}`, { redirect: "manual" });
  const type = res.headers.get("content-type") ?? "";
  const body = type.startsWith("image/") ? "" : await res.text();
  return { status: res.status, body, type };
}
/** Rutas de campañas que lista /sitemap.xml. */
async function sitemapCampaigns(): Promise<string[]> {
  const { body } = await fetchPublic("/sitemap.xml");
  return [...body.matchAll(/<loc>[^<]*\/campanas\/([^<]+)<\/loc>/g)].map((m) => m[1]);
}
/** Texto del <h1> y del primer párrafo bajo él en el detalle. */
async function detailText(ctx: BrowserContext, slug: string): Promise<{ status: number; h1: string; summary: string }> {
  const page = await ctx.newPage();
  const res = await page.goto(`/campanas/${slug}`, { waitUntil: "domcontentloaded" });
  const h1 = (await page.locator("h1").first().innerText()).trim();
  const summary = (await page.locator("h1 + p").first().innerText().catch(() => "")).trim();
  await page.close();
  return { status: res?.status() ?? 0, h1, summary };
}

async function waitStatus(page: Page, scope: string, text: string | RegExp, timeout = 25000) {
  await page.locator(`${scope} [role=status]`).filter({ hasText: text }).first().waitFor({ timeout });
}

// -----------------------------------------------------------------------------
// Prueba
// -----------------------------------------------------------------------------

async function main() {
  const backupDir = latestBackupDir();
  const backupCampaigns = JSON.parse(readFileSync(path.join(backupDir, "campaigns.json"), "utf8")) as CampaignRow[];
  const backupSettings = (JSON.parse(readFileSync(path.join(backupDir, "site_settings.json"), "utf8")) as SettingsRow[])[0];
  console.log(`Respaldo de referencia: ${path.relative(ROOT, backupDir)}`);

  const before = { campaigns: await readCampaigns(), settings: await readSettings(), media: await listMedia() };
  check(
    "Los datos actuales coinciden con el respaldo antes de empezar",
    same(before.campaigns, backupCampaigns) && same(before.settings, backupSettings),
  );

  const rand = randomBytes(4).toString("hex");
  const adminEmail = `e2e-admin-${rand}@example.com`;
  const userEmail = `e2e-usuario-${rand}@example.com`;
  let adminPassword = `${randomBytes(12).toString("base64url")}9a`;
  const userPassword = `${randomBytes(12).toString("base64url")}9a`;
  const userIds: string[] = [];

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    // --- Usuarios temporales -------------------------------------------------
    const a = await service.auth.admin.createUser({ email: adminEmail, password: adminPassword, email_confirm: true });
    if (a.error) throw a.error;
    userIds.push(a.data.user.id);
    const u = await service.auth.admin.createUser({ email: userEmail, password: userPassword, email_confirm: true });
    if (u.error) throw u.error;
    userIds.push(u.data.user.id);
    const ins = await service.from("admins").insert({ user_id: a.data.user.id, name: "Prueba Automática" });
    if (ins.error) throw ins.error;
    console.log("Usuarios temporales creados (admin y no admin).");

    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    const original = before.settings;
    const unidos = before.campaigns.find((c) => c.slug === "unidos-por-su-educacion")!;
    const bonos = before.campaigns.find((c) => c.slug === "bonos-con-sentido")!;

    // --- 1. Redirección y login ---------------------------------------------
    await step("1. /admin sin sesión redirige al login", async () => {
      await page.goto("/admin/campanas");
      check("1. /admin sin sesión redirige al login", page.url().startsWith(`${BASE}/admin/login?next=%2Fadmin%2Fcampanas`), page.url());
    });
    await step("1. Contraseña incorrecta muestra un error claro", async () => {
      await login(page, adminEmail, "incorrecta-123");
      await waitStatus(page, "form", "El correo o la contraseña no son correctos");
      check("1. Contraseña incorrecta muestra un error claro", true);
    });
    await step("1. Login correcto lleva a la ruta pedida", async () => {
      await page.goto("/admin/login?next=/admin/campanas");
      await page.getByLabel("Correo").fill(adminEmail);
      await page.getByLabel("Contraseña", { exact: true }).fill(adminPassword);
      await page.getByRole("button", { name: "Entrar" }).click();
      await page.waitForURL(`${BASE}/admin/campanas`, { timeout: 20000 });
      await page.goto("/admin");
      const h1 = await page.locator("h1:visible").innerText();
      const beat = await page.getByText(/último latido|no ha recibido su latido/).first().innerText();
      check("1. Login correcto lleva a la ruta pedida", h1.includes("Hola, Prueba"), `${h1} · ${beat.replace(/\s+/g, " ").slice(0, 90)}`);
    });

    // --- 2. Editar el título del hero -----------------------------------------
    await step("2. Editar el título del hero se ve en / y se restaura", async () => {
      const heroTitle = (original.hero as { title: string }).title;
      const temp = `Prueba automática ${rand}. Título temporal.`;
      await page.goto("/admin/contenido");
      const hero = page.locator("#portada");
      await hero.getByLabel("Título principal").fill(temp);
      await hero.getByRole("button", { name: "Guardar portada" }).click();
      await waitStatus(page, "#portada", "Se guardó «Portada»");
      const shown = (await publicText(ctx, "#hero-title")).trim();
      const okTemp = shown === temp;
      await hero.getByLabel("Título principal").fill(heroTitle);
      await hero.getByRole("button", { name: "Guardar portada" }).click();
      await page.locator("#portada [role=status]").filter({ hasText: "Se guardó" }).first().waitFor();
      // El aviso «Se guardó» del primer guardado puede seguir visible: se espera a ver el título restaurado.
      let restored = "";
      for (let i = 0; i < 20 && restored !== heroTitle; i++) {
        await page.waitForTimeout(500);
        restored = (await publicText(ctx, "#hero-title")).trim();
      }
      const dbHero = (await readSettings()).hero;
      check(
        "2. Editar el título del hero se ve en / y se restaura",
        okTemp && restored === heroTitle && same(dbHero, original.hero),
        `visto: «${shown.slice(0, 40)}…» · restaurado: ${restored === heroTitle}`,
      );
    });

    // Validación: un campo vacío muestra el error en español y no guarda.
    await step("2b. Validación Zod en español", async () => {
      const hero = page.locator("#portada");
      await hero.getByLabel("Subtítulo").fill("");
      await hero.getByRole("button", { name: "Guardar portada" }).click();
      await waitStatus(page, "#portada", "Revise los campos marcados en rojo");
      const err = await hero.getByText("Escriba el subtítulo.").count();
      const focused = await page.evaluate(() => document.activeElement?.getAttribute("name"));
      check("2b. Validación Zod en español", err === 1 && focused === "subtitle", `foco en ${focused}`);
      await page.reload();
    });

    // Fase 3: la imagen de «Quiénes somos» exige descripción; la portada explica cuándo se ve su imagen.
    await step("2c. Imagen sin descripción no se guarda y la portada explica su imagen", async () => {
      await page.goto("/admin/contenido");
      const hero = page.locator("#portada");
      const notice = (await hero.getByText(/se está mostrando/).first().innerText()).replace(/\s+/g, " ");
      const about = page.locator("#quienes-somos");
      const photo = about.locator("fieldset", { has: page.locator("legend", { hasText: "Foto de «Quiénes somos»" }) }).first();
      await photo.getByRole("tab", { name: "Pegar enlace" }).click();
      await photo.getByLabel("Enlace de la imagen (empieza por https://)").fill(EXTERNAL_IMAGE);
      await photo.getByRole("button", { name: "Usar este enlace" }).click();
      await photo.locator("[role=status]").filter({ hasText: "La imagen carga bien" }).first().waitFor({ timeout: 25000 });
      await about.getByRole("button", { name: "Guardar «Quiénes somos»" }).click();
      await waitStatus(page, "#quienes-somos", "Revise los campos marcados en rojo");
      const altError = await about.getByText("Escriba la descripción de la imagen").count();
      const dbAbout = (await readSettings()).about;
      check(
        "2c. Imagen sin descripción no se guarda y la portada explica su imagen",
        altError === 1 && same(dbAbout, original.about) && /NO se está mostrando/.test(notice),
        notice.slice(0, 120),
      );
      await page.reload();
    });

    // --- 3. Crear campaña con imagen subida ------------------------------------
    const title = `Campaña de prueba ${rand}`;
    let slug = "";
    await step("3. Crear campaña con imagen subida (comprimida en el navegador)", async () => {
      await page.goto("/admin/campanas/nueva");
      await page.getByLabel("Título", { exact: true }).fill(title);
      slug = await page.getByLabel("Dirección de la página").inputValue();
      // Para limpiar con seguridad, el slug de prueba lleva un prefijo fijo.
      slug = `${TEST_PREFIX}-${slug}`;
      await page.getByLabel("Dirección de la página").fill(slug);
      await page.getByLabel("Resumen").fill("Campaña creada por la prueba automática del panel. Se borra al terminar.");

      // Foto «de celular»: 4000×3000 JPEG de varios MB.
      const big = await sharp({
        create: { width: 4000, height: 3000, channels: 3, background: { r: 160, g: 120, b: 200 }, noise: { type: "gaussian", mean: 120, sigma: 30 } },
      })
        .jpeg({ quality: 95 })
        .toBuffer();
      await page.locator("input[type=file]").first().setInputFiles({ name: "foto-celular.jpg", mimeType: "image/jpeg", buffer: big });
      const status = page.locator("[role=status]").filter({ hasText: "Foto lista" }).first();
      await status.waitFor({ timeout: 60000 });
      const statusText = (await status.innerText()).replace(/\s+/g, " ");
      check("3. Imagen comprimida en el navegador antes de subir", /2000 × 1500 px/.test(statusText), `${statusText.slice(0, 110)} (original ${(big.length / 1048576).toFixed(1)} MB)`);

      await page.getByLabel("Descripción de la imagen").fill("Imagen de prueba de color morado.");
      await page.getByRole("textbox", { name: /^Texto completo/ }).fill("## Un título\n\nTexto con **negrita**.\n\n- uno\n- dos\n\n<script>alert(1)</script>");
      await page.getByRole("tab", { name: "Vista previa" }).first().click();
      const preview = page.locator("[role=tabpanel]:visible").filter({ has: page.locator("h2") }).first();
      const previewOk = (await preview.locator("h2").innerText()) === "Un título" && (await preview.locator("strong").count()) === 1 && (await preview.locator("li").count()) === 2 && (await preview.locator("script").count()) === 0;
      check("3. Vista previa Markdown igual que el sitio y sin HTML crudo", previewOk);
      await page.getByRole("tab", { name: "Escribir" }).first().click();

      const donation = page.getByLabel("Enlace de Donar Online");
      await donation.fill("http://donaronline.org/x");
      const noTest = await page.getByRole("link", { name: /Probar enlace de donación/ }).count();
      await donation.fill("https://example.org/donar");
      const warn = await page.getByText("Este enlace no es de Donar Online").count();
      await donation.fill("https://donaronline.org/fundapresai/prueba-automatica");
      const warnGone = await page.getByText("Este enlace no es de Donar Online").count();
      const testLink = page.getByRole("link", { name: /Probar enlace de donación/ });
      const target = await testLink.getAttribute("target");
      check("3. donation_url: https, advertencia sin bloquear y «Probar enlace»", noTest === 0 && warn === 1 && warnGone === 0 && target === "_blank");

      await page.getByLabel("Avance de la meta (%)").fill("40");
      await page.getByRole("radio", { name: /Activa/ }).check();
      await page.getByRole("button", { name: "Crear campaña" }).click();
      await page.waitForURL(/\/admin\/campanas\?creada=/, { timeout: 25000 });
      await page.getByText(`Se creó la campaña «${title}» y ya se ve en el sitio.`).waitFor();
      const titles = await publicCampaignTitles(ctx);
      const row = (await readCampaigns()).find((c) => c.slug === slug);
      check(
        "3. Crear campaña con imagen subida (comprimida en el navegador)",
        titles.includes(title) && Boolean(row?.cover_image_url?.includes(`/media/campanas/${slug}-`)) && row?.cover_image_url?.endsWith(".webp") === true,
        row?.cover_image_url?.replace(SB_URL, "") ?? "sin fila",
      );

      // Fase 3: la campaña nueva tiene su detalle (sin redeploy), sale en el sitemap y tiene imagen para redes.
      const detail = await detailText(ctx, slug);
      const inSitemap = (await sitemapCampaigns()).includes(slug);
      const og = await fetchPublic(`/og/campanas/${slug}.jpg`);
      check(
        "3. Campaña nueva: detalle 200, en el sitemap e imagen OG en JPEG",
        detail.status === 200 && detail.h1 === title && inSitemap && og.status === 200 && og.type === "image/jpeg",
        `detalle ${detail.status}, sitemap ${inSitemap}, og ${og.status} ${og.type}`,
      );
    });

    // --- 3b. Cambiar a imagen por URL (y probar Drive) --------------------------
    await step("3. Imagen por URL: valida https, convierte Drive y comprueba que cargue", async () => {
      const row = (await readCampaigns()).find((c) => c.slug === slug)!;
      const uploadedPath = row.cover_image_url?.split("/storage/v1/object/public/media/")[1] ?? "";
      await page.goto(`/admin/campanas/${row.id}/editar`);
      const cover = page.locator("fieldset", { has: page.getByText("Portada", { exact: true }) }).first();
      await cover.getByRole("tab", { name: "Pegar enlace" }).click();
      const input = cover.getByLabel("Enlace de la imagen (empieza por https://)");

      await input.fill("http://images.unsplash.com/foto.jpg");
      await cover.getByRole("button", { name: "Usar este enlace" }).click();
      const httpErr = await cover.getByText("El enlace debe empezar por https://").count();

      await input.fill(DRIVE_SHARE);
      await cover.getByRole("button", { name: "Usar este enlace" }).click();
      const driveMsg = cover.locator("[role=status]").filter({ hasText: /Google Drive/ }).first();
      await driveMsg.waitFor({ timeout: 25000 });
      const driveText = (await driveMsg.innerText()).replace(/\s+/g, " ");
      check("3. Enlace de Google Drive convertido y comprobado (resultado de hoy)", true, driveText.slice(0, 120));

      await input.fill(EXTERNAL_IMAGE);
      // Sin tocar «Usar este enlace», el formulario no deja guardar.
      await page.getByRole("button", { name: "Guardar cambios" }).click();
      const blocked = await page.getByText("Toque «Usar este enlace» para comprobar la imagen antes de guardar.").count();
      await cover.getByRole("button", { name: "Usar este enlace" }).click();
      await cover.locator("[role=status]").filter({ hasText: "La imagen carga bien" }).first().waitFor({ timeout: 25000 });
      await page.getByRole("button", { name: "Guardar cambios" }).click();
      await page.locator("form [role=status]").filter({ hasText: "Cambios guardados" }).last().waitFor({ timeout: 25000 });
      const pub = await ctx.newPage();
      await pub.goto("/");
      const src = await pub.locator("#campanas article", { hasText: title }).locator("img").first().getAttribute("src");
      await pub.close();
      check(
        "3. Imagen por URL: valida https, convierte Drive y comprueba que cargue",
        httpErr === 1 && blocked >= 1 && src === EXTERNAL_IMAGE,
        `src en / = ${src?.slice(0, 50)}`,
      );

      // La foto subida quedó huérfana (ninguna campaña ni bloque la usa): se borró del bucket.
      const media = await listMedia();
      check(
        "3. La imagen reemplazada se borra del bucket",
        Boolean(uploadedPath) && !media.includes(uploadedPath),
        uploadedPath ? `${uploadedPath} ${media.includes(uploadedPath) ? "sigue" : "borrada"}` : "sin ruta subida",
      );
    });

    // --- 3e. Detalle: editar el resumen y cambiar la dirección -----------------
    await step("3. Editar el resumen se ve en el detalle al recargar", async () => {
      const row = (await readCampaigns()).find((c) => c.slug === slug)!;
      const summary = `Resumen editado por la prueba ${rand}: se ve en el detalle al recargar.`;
      await page.goto(`/admin/campanas/${row.id}/editar`);
      await page.getByLabel("Resumen").fill(summary);
      await page.getByRole("button", { name: "Guardar cambios" }).click();
      await page.locator("form [role=status]").filter({ hasText: "Cambios guardados" }).last().waitFor({ timeout: 25000 });
      const detail = await detailText(ctx, slug);
      check("3. Editar el resumen se ve en el detalle al recargar", detail.summary === summary, `«${detail.summary.slice(0, 50)}…»`);
    });

    await step("3. Cambiar la dirección: la nueva funciona y la vieja da 404", async () => {
      const row = (await readCampaigns()).find((c) => c.slug === slug)!;
      const renamed = `${slug}-nueva`;
      await page.goto(`/admin/campanas/${row.id}/editar`);
      await page.getByLabel("Dirección de la página").fill(renamed);
      await page.getByRole("button", { name: "Guardar cambios" }).click();
      await page.locator("form [role=status]").filter({ hasText: "Cambios guardados" }).last().waitFor({ timeout: 25000 });
      const fresh = await fetchPublic(`/campanas/${renamed}`);
      const old = await fetchPublic(`/campanas/${slug}`);
      const listed = await sitemapCampaigns();
      check(
        "3. Cambiar la dirección: la nueva funciona y la vieja da 404",
        fresh.status === 200 && old.status === 404 && listed.includes(renamed) && !listed.includes(slug),
        `nueva ${fresh.status}, vieja ${old.status}, sitemap: ${listed.includes(renamed)}/${listed.includes(slug)}`,
      );
      slug = renamed;
    });

    // --- 3c. Ocultar ------------------------------------------------------------
    await step("3. Ocultar con un toque la quita de /", async () => {
      await page.goto("/admin/campanas");
      await page.getByRole("button", { name: `Ocultar «${title}»` }).click();
      await page.getByText(`«${title}» quedó oculta`).waitFor({ timeout: 25000 });
      const titles = await publicCampaignTitles(ctx);
      const badge = await page.locator("li", { hasText: title }).getByText("Oculta", { exact: true }).count();
      check("3. Ocultar con un toque la quita de /", !titles.includes(title) && badge === 1);

      // Fase 3: oculta → su detalle da 404 (página amable), sale del sitemap y de la imagen OG.
      const detail = await fetchPublic(`/campanas/${slug}`);
      const listed = await sitemapCampaigns();
      const og = await fetchPublic(`/og/campanas/${slug}.jpg`);
      check(
        "3. Campaña oculta: detalle 404 y fuera del sitemap",
        detail.status === 404 && detail.body.includes("No encontramos esta página") && !listed.includes(slug) && og.status === 404,
        `detalle ${detail.status}, en sitemap ${listed.includes(slug)}, og ${og.status}`,
      );
    });

    // --- 3d. Eliminar con el modal ----------------------------------------------
    await step("3. Eliminar con modal propio (Esc, foco atrapado, aria-modal)", async () => {
      const trigger = page.getByRole("button", { name: `Eliminar «${title}»` });
      await trigger.click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      const modal = await dialog.getAttribute("aria-modal");
      const focusStart = await page.evaluate(() => document.activeElement?.textContent?.trim());
      let trapped = true;
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("Tab");
        trapped &&= await page.evaluate(() => Boolean(document.activeElement?.closest("dialog")));
      }
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      const focusBack = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
      const stillThere = (await readCampaigns()).some((c) => c.slug === slug);
      await trigger.click();
      await page.getByRole("button", { name: "Sí, eliminar" }).click();
      await page.getByText(`Se eliminó la campaña «${title}».`).waitFor({ timeout: 25000 });
      const gone = !(await readCampaigns()).some((c) => c.slug === slug);
      const inList = await page.getByRole("heading", { name: title }).count();
      check(
        "3. Eliminar con modal propio (Esc, foco atrapado, aria-modal)",
        modal === "true" && focusStart === "Cancelar" && trapped && stillThere && focusBack.startsWith("Eliminar") && gone && inList === 0,
        `foco inicial «${focusStart}», Esc conserva: ${stillThere}, foco vuelve a «${focusBack.slice(0, 20)}»`,
      );
    });

    // --- 4. Reordenar ------------------------------------------------------------
    await step("4. Reordenar con ↑ ↓ cambia / y se restaura", async () => {
      // En / la destacada siempre va primero: se mueve una que no lo es (posición 2 → 3).
      const beca = before.campaigns.find((c) => c.slug === "beca-estudiantes")!;
      await page.goto("/admin/campanas");
      await page.getByRole("button", { name: `Bajar «${bonos.title}»` }).click();
      await page.getByText(`«${bonos.title}» quedó en la posición 3`).waitFor({ timeout: 25000 });
      const titles = await publicCampaignTitles(ctx);
      const moved = titles.indexOf(beca.title) < titles.indexOf(bonos.title);
      const listOrder = (await page.locator("ol > li h2").allInnerTexts()).map((t) => t.trim());
      await page.getByRole("button", { name: `Subir «${bonos.title}»` }).click();
      await page.getByText(`«${bonos.title}» quedó en la posición 2`).waitFor({ timeout: 25000 });
      const after = await readCampaigns();
      const orderBack = before.campaigns.every((c) => after.find((x) => x.id === c.id)?.sort_order === c.sort_order);
      const titlesBack = await publicCampaignTitles(ctx);
      check(
        "4. Reordenar con ↑ ↓ cambia / y se restaura",
        moved && listOrder[2] === bonos.title && orderBack && titlesBack.indexOf(bonos.title) < titlesBack.indexOf(beca.title),
        `/ con el cambio: ${titles.join(" › ")}`,
      );
    });

    // --- 5. Cambiar la destacada ---------------------------------------------------
    await step("5. Cambiar la destacada (una sola) y restaurarla", async () => {
      await page.goto(`/admin/campanas/${bonos.id}/editar`);
      await page.getByRole("checkbox", { name: /Campaña destacada/ }).check();
      await page.getByRole("button", { name: "Guardar cambios" }).click();
      await page.locator("form [role=status]").filter({ hasText: "Cambios guardados" }).last().waitFor({ timeout: 25000 });
      const mid = await readCampaigns();
      const onlyBonos = mid.filter((c) => c.is_featured).map((c) => c.slug).join(",") === bonos.slug;
      const heroLabel = await (async () => {
        const p = await ctx.newPage();
        await p.goto("/");
        const label = await p.locator("article[aria-label^='Campaña destacada']").getAttribute("aria-label");
        await p.close();
        return label;
      })();
      await page.goto(`/admin/campanas/${unidos.id}/editar`);
      await page.getByRole("checkbox", { name: /Campaña destacada/ }).check();
      await page.getByRole("button", { name: "Guardar cambios" }).click();
      await page.locator("form [role=status]").filter({ hasText: "Cambios guardados" }).last().waitFor({ timeout: 25000 });
      const end = await readCampaigns();
      const restored = end.filter((c) => c.is_featured).map((c) => c.slug).join(",") === unidos.slug;
      check("5. Cambiar la destacada (una sola) y restaurarla", onlyBonos && heroLabel?.includes(bonos.title) === true && restored, `hero: ${heroLabel}`);
    });

    // --- 6. Usuario autenticado sin permisos -------------------------------------
    await step("6. Usuario sin permisos: aviso amable y sin formularios", async () => {
      const uctx = await newContext(browser);
      const up = await uctx.newPage();
      await login(up, userEmail, userPassword);
      await up.getByRole("heading", { name: /no tiene acceso/ }).waitFor({ timeout: 20000 });
      const h1 = await up.locator("h1:visible").innerText();
      await up.goto("/admin/contenido");
      const forms = await up.locator("form button[type=submit]").filter({ hasText: "Guardar" }).count();
      const h1b = await up.locator("h1:visible").innerText();
      check("6. Usuario sin permisos: aviso amable y sin formularios", h1.includes("no tiene acceso") && h1b.includes("no tiene acceso") && forms === 0, h1);

      // La Server Action con la sesión del no admin (cookies cambiadas en una página ya cargada).
      const adminCookies = await ctx.cookies();
      const userCookies = await uctx.cookies();
      await page.goto("/admin/contenido");
      await ctx.clearCookies();
      await ctx.addCookies(userCookies);
      const hero = page.locator("#portada");
      await hero.getByLabel("Título principal").fill("Intento sin permiso");
      await hero.getByRole("button", { name: "Guardar portada" }).click();
      await waitStatus(page, "#portada", "no tiene permiso");
      await ctx.clearCookies();
      await ctx.addCookies(adminCookies);
      const unchanged = same((await readSettings()).hero, original.hero);
      check("6. La Server Action rechaza al no admin (verificación en servidor)", unchanged);

      // Directo contra la API con su sesión: RLS bloquea todo.
      const sb = createClient<Database>(SB_URL, anonKey, opts);
      await sb.auth.signInWithPassword({ email: userEmail, password: userPassword });
      const upd = await sb.from("site_settings").update({ privacy_md: "x" }).eq("id", 1).select("id");
      const insC = await sb.from("campaigns").insert({ slug: `${TEST_PREFIX}-api`, title: "x", summary: "x", donation_url: "https://donaronline.org/x" });
      const delC = await sb.from("campaigns").delete().eq("id", unidos.id).select("id");
      const upl = await sb.storage.from("media").upload(`campanas/${TEST_PREFIX}-api.png`, new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }), { contentType: "image/png" });
      const featured = await sb.rpc("set_featured_campaign", { p_campaign_id: bonos.id });
      const beat = await sb.rpc("last_heartbeat");
      check(
        "6. RLS: el no admin no puede escribir por la API",
        (upd.data?.length ?? 0) === 0 && Boolean(insC.error) && (delC.data?.length ?? 0) === 0 && Boolean(upl.error) && Boolean(featured.error) && Boolean(beat.error),
        `update=${upd.data?.length ?? 0} filas, insert=${insC.error?.code}, delete=${delC.data?.length ?? 0}, storage=${upl.error ? "error" : "OK"}, destacar=${featured.error?.code}, latido=${beat.error?.code}`,
      );
      await sb.auth.signOut();
      await uctx.close();
    });

    // --- 7. Recuperación de contraseña ---------------------------------------------
    await step("7. Recuperación de contraseña (token_hash → nueva contraseña)", async () => {
      const link = await service.auth.admin.generateLink({ type: "recovery", email: adminEmail });
      if (link.error) throw link.error;
      const rctx = await newContext(browser);
      const rp = await rctx.newPage();
      await rp.goto(`/auth/confirm?token_hash=${link.data.properties.hashed_token}&type=recovery&next=/admin/restablecer`);
      await rp.waitForURL(`${BASE}/admin/restablecer`, { timeout: 20000 });
      const newPassword = `${randomBytes(12).toString("base64url")}7b`;
      await rp.getByLabel("Nueva contraseña", { exact: true }).fill(newPassword);
      await rp.getByLabel("Repita la nueva contraseña").fill(`${newPassword}x`);
      await rp.getByRole("button", { name: "Guardar contraseña" }).click();
      await rp.getByText("Las dos contraseñas no coinciden.").waitFor();
      await rp.getByLabel("Repita la nueva contraseña").fill(newPassword);
      await rp.getByRole("button", { name: "Guardar contraseña" }).click();
      await rp.waitForURL(`${BASE}/admin?aviso=clave`, { timeout: 20000 });
      await rp.getByText("Su contraseña se cambió correctamente.").waitFor();
      // Enlace ya usado → aviso claro.
      await rp.goto(`/auth/confirm?token_hash=${link.data.properties.hashed_token}&type=recovery&next=/admin/restablecer`);
      const reused = rp.url().includes("/admin/recuperar?error=enlace");
      adminPassword = newPassword;
      // Otro navegador (sin cookies): entrar con la nueva contraseña.
      await rctx.clearCookies();
      await login(rp, adminEmail, adminPassword);
      await rp.waitForURL(`${BASE}/admin`, { timeout: 20000 });
      check("7. Recuperación de contraseña (token_hash → nueva contraseña)", reused, "enlace reutilizado → aviso «ya venció o ya se usó»");

      // El formulario «¿Olvidó su contraseña?» (sin SMTP propio, Supabase puede negarse a enviar).
      await rctx.clearCookies();
      await rp.goto("/admin/recuperar");
      await rp.getByLabel("Correo").fill(adminEmail);
      await rp.getByRole("button", { name: "Enviarme el enlace" }).click();
      const msg = rp.locator("form [role=status] p, form [role=status] div").first();
      await msg.waitFor({ timeout: 20000 });
      check("7. «¿Olvidó su contraseña?» responde con un mensaje claro", true, (await msg.innerText()).replace(/\s+/g, " ").slice(0, 120));
      await rctx.close();
    });

    // --- 8. Cerrar sesión --------------------------------------------------------
    await step("8. Cerrar sesión", async () => {
      await page.goto("/admin");
      await page.getByRole("button", { name: "Cerrar sesión" }).click();
      await page.waitForURL(/\/admin\/login\?salio=1/, { timeout: 20000 });
      await page.goto("/admin");
      check("8. Cerrar sesión", page.url().startsWith(`${BASE}/admin/login`));
    });

    // --- 9. Capturas y chequeos ----------------------------------------------------
    if (SHOTS) {
      mkdirSync(OUT, { recursive: true });
      const shots = [
        { name: "inicio", path: "/admin" },
        { name: "campanas", path: "/admin/campanas" },
        { name: "editor-campana", path: `/admin/campanas/${unidos.id}/editar` },
        { name: "editar-sitio", path: "/admin/contenido" },
        { name: "login", path: "/admin/login" },
      ];
      for (const width of [375, 1440]) {
        const sctx = await newContext(browser, width, width < 768 ? 2 : 1);
        const sp = await sctx.newPage();
        await sp.goto("/admin/login");
        await settle(sp);
        await fullPageShot(sp, path.join(OUT, `login-${width}.png`), width);
        await login(sp, adminEmail, adminPassword);
        await sp.waitForURL(`${BASE}/admin`, { timeout: 20000 });
        for (const s of shots.filter((x) => x.name !== "login")) {
          await sp.goto(s.path, { waitUntil: "networkidle" });
          await settle(sp);
          await fullPageShot(sp, path.join(OUT, `${s.name}-${width}.png`), width);
        }
        // El modal de eliminar, abierto (vista del viewport).
        await sp.goto("/admin/campanas", { waitUntil: "networkidle" });
        await sp.getByRole("button", { name: `Eliminar «${unidos.title}»` }).click();
        await sp.getByRole("dialog").waitFor();
        await sp.waitForTimeout(300);
        await sp.screenshot({ path: path.join(OUT, `modal-eliminar-${width}.png`) });
        await sp.keyboard.press("Escape");
        await sctx.close();
      }
      console.log(`Capturas en ${OUT}`);

      // Chequeos: scroll horizontal, h1 único, texto ≥ 16 px, tocables ≥ 48 px y axe.
      const cases = [
        { label: "320", width: 320, scale: 1 },
        { label: "375", width: 375, scale: 1 },
        { label: "1440", width: 1440, scale: 1 },
        { label: "1440 zoom 200 %", width: 720, scale: 2 },
      ];
      for (const c of cases) {
        const cctx = await newContext(browser, c.width, c.scale);
        const cp = await cctx.newPage();
        await login(cp, adminEmail, adminPassword);
        await cp.waitForURL(`${BASE}/admin`, { timeout: 20000 });
        for (const s of shots) {
          if (s.name === "login") await cctx.clearCookies();
          await cp.goto(s.path, { waitUntil: "networkidle" });
          const r = await runChecks(cp);
          const issues = [
            r.overflow.scrollWidth > r.overflow.clientWidth && `scroll horizontal: ${r.overflow.offenders.join(" | ")}`,
            r.h1Count !== 1 && `${r.h1Count} h1`,
            r.smallText.length > 0 && `texto < 16 px: ${r.smallText.join(" | ")}`,
            r.smallTargets.length > 0 && `tocables < 48 px: ${r.smallTargets.join(" | ")}`,
          ].filter(Boolean) as string[];
          if (c.width === 375 || c.width === 1440) {
            const v = await runAxe(cp);
            if (v.length) issues.push(`axe: ${v.map((x) => `${x.impact} ${x.id} ×${x.count} (${x.first})`).join(" | ")}`);
          }
          check(`9. Accesibilidad ${s.name} @ ${c.label}`, issues.length === 0, issues.join(" ;; ").slice(0, 400) || undefined);
        }
        await cctx.close();
      }
    }
    await ctx.close();
  } finally {
    await browser.close();
    console.log("\nLimpieza…");
    // Campañas, imágenes, admins y usuarios de prueba.
    const { data: testCampaigns } = await service.from("campaigns").delete().like("slug", `${TEST_PREFIX}%`).select("slug");
    const afterMedia = await listMedia();
    const newMedia = afterMedia.filter((m) => !before.media.includes(m));
    if (newMedia.length) await service.storage.from("media").remove(newMedia);
    for (const id of userIds) {
      await service.from("admins").delete().eq("user_id", id);
      await service.auth.admin.deleteUser(id);
    }
    console.log(`Borrado: ${testCampaigns?.length ?? 0} campañas de prueba, ${newMedia.length} imágenes, ${userIds.length} usuarios.`);

    // Restaurar exactamente (también updated_at) y comparar con el respaldo.
    const nowCampaigns = await readCampaigns();
    const nowSettings = await readSettings();
    if (!same(nowCampaigns, backupCampaigns) || !same(nowSettings, backupSettings)) {
      await restoreExact(backupCampaigns, backupSettings);
    }
    const finalCampaigns = await readCampaigns();
    const finalSettings = await readSettings();
    const leftovers = {
      users: (await service.auth.admin.listUsers({ perPage: 1000 })).data.users.filter((x) => x.email?.startsWith("e2e-")).length,
      admins: (await service.from("admins").select("user_id").in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"])).data?.length ?? 0,
      media: (await listMedia()).filter((m) => !before.media.includes(m)).length,
    };
    check("Datos finales idénticos al respaldo (4 campañas y site_settings)", same(finalCampaigns, backupCampaigns) && same(finalSettings, backupSettings));
    check("Sin restos de prueba (usuarios, admins, imágenes)", leftovers.users === 0 && leftovers.admins === 0 && leftovers.media === 0, JSON.stringify(leftovers));
  }

  if (consoleErrors.length) console.log(`\nErrores de consola (${consoleErrors.length}):\n  ${[...new Set(consoleErrors)].slice(0, 12).join("\n  ")}`);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} comprobaciones OK.`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
