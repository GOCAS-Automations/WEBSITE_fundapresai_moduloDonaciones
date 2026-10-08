/**
 * Chequeo de SEO del sitio LOCAL (plan §11), con `npm run build && npm run start`
 * corriendo:
 *
 *   npm run check:seo                 (contra http://localhost:3000)
 *
 * Revisa en el HTML servido de la landing, cada campaña activa, privacidad y
 * una 404:
 *   - title, description, canonical absoluto, Open Graph y Twitter con URL
 *     absolutas (y que la imagen responda 200 como imagen, con su tamaño);
 *   - robots: noindex en todo si NEXT_PUBLIC_ALLOW_INDEXING no es "true"
 *     (meta y cabecera X-Robots-Tag) y siempre en /admin;
 *   - imagen para redes: og:image de 1200×630 en JPEG (< 300 KB la de marca),
 *     con width, height, type, alt, site_name, locale es_CO y
 *     twitter:card = summary_large_image;
 *   - JSON-LD válido: WebSite (nombre del sitio) y NGO (logo ImageObject PNG
 *     ≥ 112 px y opaco) en la landing, y WebPage + DonateAction en cada
 *     campaña, apuntando a su donation_url;
 *   - favicon.ico real con 16, 32 y 48 px; icon.png cuadrado y múltiplo de
 *     48 px; apple-touch-icon de 180×180 opaco; manifest con 192 y 512 px,
 *     uno maskable, name, short_name, theme_color y background_color;
 *   - sitemap.xml (landing, campañas activas y privacidad; nada más) y robots.txt.
 *
 * Las campañas activas se leen con la clave pública (igual que el sitio).
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

import { assertLocalhost } from "./lib/browser";
import { loadLocalEnv, requireEnv } from "./lib/env";

loadLocalEnv();

const BASE = (process.argv.includes("--url") ? process.argv[process.argv.indexOf("--url") + 1] : "http://localhost:3000").replace(/\/+$/, "");
assertLocalhost(BASE);

const SITE = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) failures++;
  console.log(`${ok ? "OK  " : "FALLA"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function get(pathname: string) {
  const res = await fetch(`${BASE}${pathname}`, { redirect: "manual" });
  const type = res.headers.get("content-type") ?? "";
  const body = type.startsWith("text/") || type.includes("xml") || type.includes("json") ? await res.text() : "";
  return { status: res.status, type, body, robotsHeader: res.headers.get("x-robots-tag") ?? "" };
}

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** Atributos de las etiquetas <meta> y <link> del HTML. */
function headTags(html: string) {
  const metas = new Map<string, string[]>();
  for (const m of html.matchAll(/<meta\s+([^>]+?)\/?>/g)) {
    const attrs = Object.fromEntries([...m[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [a[1], decode(a[2])]));
    const key = attrs.property ?? attrs.name;
    if (key && attrs.content !== undefined) metas.set(key, [...(metas.get(key) ?? []), attrs.content]);
  }
  const links: Record<string, string>[] = [];
  for (const m of html.matchAll(/<link\s+([^>]+?)\/?>/g)) {
    links.push(Object.fromEntries([...m[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [a[1], decode(a[2])])));
  }
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
  const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  return { metas, links, title, jsonLd, meta: (k: string) => metas.get(k)?.[0] ?? "" };
}

const isAbsolute = (u: string) => /^https?:\/\/[^/]+/.test(u);
const onSite = (u: string) => u.startsWith(`${SITE}/`) || u === SITE;
const indexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING?.trim().toLowerCase() === "true";

/** Si la URL es de este sitio, la pide al servidor local; si no, a internet (solo la cabecera). */
async function imageOk(url: string): Promise<string | null> {
  const local = onSite(url) ? `${BASE}${url.slice(SITE.length)}` : url;
  try {
    const res = await fetch(local, { method: onSite(url) ? "GET" : "HEAD" });
    const type = res.headers.get("content-type") ?? "";
    return res.ok && type.startsWith("image/") ? null : `${res.status} ${type}`;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

type ImageInfo = { status: number; type: string; bytes: number; width: number; height: number; opaque: boolean };

/** Descarga una imagen (del servidor local si es de este sitio) y la mide con sharp. */
async function imageInfo(url: string): Promise<ImageInfo> {
  const local = onSite(url) ? `${BASE}${url.slice(SITE.length)}` : new URL(url, BASE).toString();
  const res = await fetch(local);
  const buf = Buffer.from(await res.arrayBuffer());
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.startsWith("image/") || type.includes("icon")) {
    return { status: res.status, type, bytes: buf.length, width: 0, height: 0, opaque: false };
  }
  const meta = await sharp(buf).metadata();
  const opaque = !meta.hasAlpha || (await sharp(buf).stats()).channels[3]?.min === 255;
  return { status: res.status, type, bytes: buf.length, width: meta.width ?? 0, height: meta.height ?? 0, opaque };
}

/** Tamaños de un .ico (cabecera ICONDIR + entradas). null si no es un ICO real. */
function icoSizes(buf: Buffer): number[] | null {
  if (buf.length < 6 || buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) return null;
  const n = buf.readUInt16LE(4);
  return Array.from({ length: n }, (_, i) => buf[6 + i * 16] || 256);
}

function parseJsonLd(blocks: string[]): Record<string, unknown>[] | null {
  try {
    return blocks.map((b) => JSON.parse(b) as Record<string, unknown>);
  } catch {
    return null;
  }
}

async function checkPage(label: string, pathname: string, expect: { status: number; jsonLdType?: string; donationUrl?: string }) {
  const page = await get(pathname);
  check(`${label}: responde ${expect.status}`, page.status === expect.status, String(page.status));
  const h = headTags(page.body);

  // Robots: noindex global en la demo; en 404 siempre (Next lo agrega).
  const robots = h.metas.get("robots") ?? [];
  const noindexMeta = robots.some((r) => r.includes("noindex"));
  const noindexHeader = page.robotsHeader.includes("noindex");
  if (expect.status === 404) {
    check(`${label}: noindex`, noindexMeta, robots.join(" | "));
  } else if (indexing) {
    check(`${label}: indexable (sin noindex)`, !noindexMeta && !noindexHeader, `${robots.join(" | ")} ${page.robotsHeader}`.trim());
  } else {
    check(`${label}: noindex en la demo (meta y cabecera)`, noindexMeta && noindexHeader, `${robots.join(" | ")} · ${page.robotsHeader}`);
  }
  if (expect.status !== 200) return;

  const canonical = h.links.find((l) => l.rel === "canonical")?.href ?? "";
  const ogImage = h.meta("og:image");
  const twImage = h.meta("twitter:image");
  const problems = [
    !h.title && "sin <title>",
    !h.meta("description") && "sin description",
    canonical !== `${SITE}${pathname === "/" ? "" : pathname}` && canonical !== `${SITE}${pathname}` && `canonical ${canonical}`,
    !h.meta("og:title") && "sin og:title",
    !h.meta("og:description") && "sin og:description",
    !onSite(h.meta("og:url")) && `og:url ${h.meta("og:url")}`,
    h.meta("og:locale") !== "es_CO" && `og:locale ${h.meta("og:locale")}`,
    !h.meta("og:site_name") && "sin og:site_name",
    !isAbsolute(ogImage) && `og:image no absoluta: ${ogImage}`,
    !h.meta("og:image:alt") && "sin og:image:alt",
    h.meta("twitter:card") !== "summary_large_image" && `twitter:card ${h.meta("twitter:card")}`,
    !isAbsolute(twImage) && `twitter:image no absoluta: ${twImage}`,
    !h.meta("twitter:title") && "sin twitter:title",
  ].filter(Boolean);
  check(`${label}: title, description, canonical, OG y Twitter`, problems.length === 0, problems.join("; ") || `«${h.title}»`);

  const size = `${h.meta("og:image:width")}×${h.meta("og:image:height")}`;
  const imageProblem = ogImage ? await imageOk(ogImage) : "sin imagen";
  check(`${label}: imagen OG carga`, imageProblem === null, `${ogImage.replace(SITE, "")} ${size} ${imageProblem ?? ""}`.trim());

  // Las imágenes propias del sitio (marca y portadas): 1200×630 en JPEG, declaradas igual en las metas.
  if (ogImage && onSite(ogImage)) {
    const img = await imageInfo(ogImage);
    const isBrand = new URL(ogImage).pathname === "/og/fundapresai.jpg";
    const ogProblems = [
      (img.width !== 1200 || img.height !== 630) && `mide ${img.width}×${img.height}`,
      !img.type.startsWith("image/jpeg") && `tipo ${img.type}`,
      isBrand && img.bytes >= 300 * 1024 && `pesa ${Math.round(img.bytes / 1024)} KB`,
      size !== "1200×630" && `metas width/height ${size}`,
      h.meta("og:image:type") !== "image/jpeg" && `og:image:type ${h.meta("og:image:type") || "(falta)"}`,
    ].filter(Boolean);
    check(
      `${label}: OG 1200×630 JPEG${isBrand ? " < 300 KB (marca, estática)" : ""}`,
      ogProblems.length === 0,
      ogProblems.join("; ") || `${Math.round(img.bytes / 1024)} KB`,
    );
  }

  if (expect.jsonLdType) {
    const blocks = parseJsonLd(h.jsonLd);
    const ldProblems: string[] = [];
    if (!blocks || blocks.length === 0) ldProblems.push(`JSON-LD inválido o ausente (${h.jsonLd.length} bloques)`);
    const byType = (t: string) => blocks?.find((b) => b["@type"] === t) ?? null;
    const data = byType(expect.jsonLdType);
    if (blocks && !data) ldProblems.push(`sin @type ${expect.jsonLdType} (hay: ${blocks.map((b) => String(b["@type"])).join(", ")})`);
    for (const b of blocks ?? []) if (b["@context"] !== "https://schema.org") ldProblems.push(`@context de ${String(b["@type"])}`);
    if (data && expect.jsonLdType === "NGO") {
      for (const k of ["name", "alternateName", "url", "logo", "contactPoint"]) if (!data[k]) ldProblems.push(`sin ${k}`);
      if (!Array.isArray(data.sameAs) || data.sameAs.length === 0) ldProblems.push("sin sameAs");
      if (data.url !== `${SITE}/`) ldProblems.push(`url ${String(data.url)}`);
      const cp = data.contactPoint as Record<string, unknown> | undefined;
      if (cp && cp["@type"] !== "ContactPoint") ldProblems.push("contactPoint sin @type");
      // Logo: ImageObject con URL absoluta a un PNG de 112 px o más, opaco (se ve bien en blanco).
      const logo = data.logo as Record<string, unknown> | undefined;
      const logoUrl = typeof logo?.url === "string" ? logo.url : "";
      if (logo?.["@type"] !== "ImageObject") ldProblems.push("logo no es ImageObject");
      if (!isAbsolute(logoUrl) || !onSite(logoUrl)) ldProblems.push(`logo.url no absoluta: ${logoUrl}`);
      else {
        const img = await imageInfo(logoUrl);
        if (img.status !== 200 || !img.type.startsWith("image/png")) ldProblems.push(`logo ${img.status} ${img.type}`);
        if (img.width < 112 || img.height < 112) ldProblems.push(`logo de ${img.width}×${img.height} (< 112)`);
        if (!img.opaque) ldProblems.push("logo con transparencia");
        if (Number(logo?.width) !== img.width || Number(logo?.height) !== img.height) ldProblems.push("logo.width/height no coinciden");
      }
      // WebSite: nombre del sitio en Google.
      const site = byType("WebSite");
      if (!site) ldProblems.push("sin WebSite");
      else {
        if (site.name !== "Fundapresai") ldProblems.push(`WebSite.name ${String(site.name)}`);
        if (site.alternateName !== "Fundación Fundapresai") ldProblems.push(`WebSite.alternateName ${String(site.alternateName)}`);
        if (site.url !== `${SITE}/`) ldProblems.push(`WebSite.url ${String(site.url)}`);
        if (site.inLanguage !== "es-CO") ldProblems.push(`WebSite.inLanguage ${String(site.inLanguage)}`);
      }
    } else if (data) {
      for (const k of ["name", "url", "description"]) if (!data[k]) ldProblems.push(`sin ${k}`);
      if (data.url !== `${SITE}${pathname}`) ldProblems.push(`url ${String(data.url)}`);
      const action = data.potentialAction as Record<string, unknown> | undefined;
      if (action?.["@type"] !== "DonateAction") ldProblems.push("sin DonateAction");
      if (action?.target !== expect.donationUrl) ldProblems.push(`target ${String(action?.target)}`);
      if ((action?.recipient as Record<string, unknown> | undefined)?.["@type"] !== "NGO") ldProblems.push("recipient");
    }
    const what = expect.jsonLdType === "NGO" ? "WebSite + NGO (logo)" : expect.jsonLdType;
    check(`${label}: JSON-LD ${what}`, ldProblems.length === 0, ldProblems.join("; ") || undefined);
  }
  return h;
}

async function main() {
  const supabase = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: campaigns, error } = await supabase.from("campaigns").select("slug, donation_url").eq("status", "active");
  if (error) throw error;
  console.log(`Sitio canónico: ${SITE} · indexación ${indexing ? "PERMITIDA" : "bloqueada (demo)"} · ${campaigns.length} campañas activas\n`);

  const home = await checkPage("Landing", "/", { status: 200, jsonLdType: "NGO" });
  for (const c of campaigns) {
    await checkPage(`Campaña ${c.slug}`, `/campanas/${c.slug}`, { status: 200, jsonLdType: "WebPage", donationUrl: c.donation_url });
  }
  await checkPage("Privacidad", "/privacidad", { status: 200 });
  await checkPage("404 de campaña", "/campanas/no-existe-esta-campana", { status: 404 });
  await checkPage("404 de dirección", "/esta-direccion-no-existe", { status: 404 });

  // Panel: siempre noindex.
  const login = await get("/admin/login");
  const loginRobots = headTags(login.body).metas.get("robots") ?? [];
  check("Panel: noindex siempre", loginRobots.some((r) => r.includes("noindex")) && login.robotsHeader.includes("noindex"));

  // Íconos y manifest enlazados y servidos.
  if (home) {
    const wanted = [
      { rel: "icon", type: "favicon / icon" },
      { rel: "apple-touch-icon", type: "apple-touch-icon" },
      { rel: "manifest", type: "manifest" },
    ];
    for (const w of wanted) {
      const links = home.links.filter((l) => l.rel === w.rel);
      const statuses = await Promise.all(links.map(async (l) => (await fetch(new URL(l.href, BASE))).status));
      check(`Enlace ${w.type}`, links.length > 0 && statuses.every((s) => s === 200), links.map((l, i) => `${l.href} ${statuses[i]}`).join(", "));
    }

    // favicon.ico: un ICO de verdad (no un PNG renombrado) con 16, 32 y 48 px.
    const icoLink = home.links.find((l) => l.rel === "icon" && /\.ico(\?|$)/.test(l.href));
    const ico = await fetch(new URL(icoLink?.href ?? "/favicon.ico", BASE));
    const sizes = icoSizes(Buffer.from(await ico.arrayBuffer())) ?? [];
    check("favicon.ico real con 16, 32 y 48 px", [16, 32, 48].every((n) => sizes.includes(n)), `${icoLink?.href ?? "(sin <link>)"} → ${sizes.join(", ") || "no es ICO"}`);

    // icon.png: cuadrado y múltiplo de 48 (requisito de Google para el favicon en resultados).
    const pngLink = home.links.find((l) => l.rel === "icon" && l.type === "image/png");
    const png = pngLink ? await imageInfo(new URL(pngLink.href, BASE).toString()) : null;
    check(
      "icon.png cuadrado y múltiplo de 48 px",
      Boolean(png && png.width === png.height && png.width % 48 === 0 && pngLink?.sizes === `${png.width}x${png.height}`),
      png ? `${pngLink?.href} ${png.width}×${png.height} (sizes=${pngLink?.sizes})` : "sin <link rel=icon type=image/png>",
    );

    // apple-touch-icon: 180×180 y opaco (iOS pone negro lo transparente).
    const appleLink = home.links.find((l) => l.rel === "apple-touch-icon");
    const apple = appleLink ? await imageInfo(new URL(appleLink.href, BASE).toString()) : null;
    check(
      "apple-touch-icon 180×180 opaco",
      Boolean(apple && apple.width === 180 && apple.height === 180 && apple.opaque),
      apple ? `${apple.width}×${apple.height} ${apple.opaque ? "opaco" : "CON transparencia"}` : "sin enlace",
    );

    // Manifest: nombre, colores e íconos de 192 y 512 (uno maskable), que carguen y midan lo que dicen.
    const manifestLink = home.links.find((l) => l.rel === "manifest");
    const manifest = manifestLink
      ? ((await (await fetch(new URL(manifestLink.href, BASE))).json()) as {
          name?: string;
          short_name?: string;
          theme_color?: string;
          background_color?: string;
          icons?: { src: string; sizes: string; type?: string; purpose?: string }[];
        })
      : null;
    const mProblems: string[] = [];
    if (!manifest) mProblems.push("sin manifest");
    else {
      if (!manifest.name) mProblems.push("sin name");
      if (manifest.short_name !== "Fundapresai") mProblems.push(`short_name ${manifest.short_name}`);
      if (manifest.theme_color?.toLowerCase() !== "#5f2c85") mProblems.push(`theme_color ${manifest.theme_color}`);
      if (!manifest.background_color) mProblems.push("sin background_color");
      const icons = manifest.icons ?? [];
      for (const need of ["192x192", "512x512"]) if (!icons.some((i) => i.sizes === need)) mProblems.push(`sin ícono ${need}`);
      const maskable = icons.find((i) => i.purpose?.includes("maskable"));
      if (!maskable) mProblems.push("sin ícono maskable");
      for (const icon of icons) {
        const info = await imageInfo(new URL(icon.src, BASE).toString());
        if (info.status !== 200 || `${info.width}x${info.height}` !== icon.sizes) mProblems.push(`${icon.src} ${info.status} ${info.width}x${info.height}`);
        if (icon === maskable && !info.opaque) mProblems.push("maskable con transparencia");
      }
    }
    check("manifest: name, short_name, colores e íconos 192/512 + maskable", mProblems.length === 0, mProblems.join("; ") || `${manifest?.icons?.length} íconos`);
  }

  // Sitemap: exactamente landing, campañas activas y privacidad.
  const sitemap = await get("/sitemap.xml");
  const locs = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();
  const expected = [`${SITE}/`, `${SITE}/privacidad`, ...campaigns.map((c) => `${SITE}/campanas/${c.slug}`)].sort();
  check("sitemap.xml: landing, campañas activas y privacidad", JSON.stringify(locs) === JSON.stringify(expected), `${locs.length} URL`);

  // robots.txt
  const robots = await get("/robots.txt");
  const robotsOk = indexing
    ? /Disallow: \/admin/.test(robots.body) && /Sitemap: /.test(robots.body)
    : /User-Agent: \*\s*\nDisallow: \/\s*$/m.test(robots.body) && /Disallow: \/admin/.test(robots.body);
  check(`robots.txt (${indexing ? "indexación" : "demo"})`, robotsOk, robots.body.replace(/\s+/g, " ").slice(0, 160));

  console.log(failures ? `\n${failures} falla(s).` : "\nTodo bien.");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
