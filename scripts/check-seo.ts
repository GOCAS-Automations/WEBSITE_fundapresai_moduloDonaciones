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
 *   - JSON-LD válido: NGO en la landing y WebPage + DonateAction en cada
 *     campaña, apuntando a su donation_url;
 *   - sitemap.xml (landing, campañas activas y privacidad; nada más),
 *     robots.txt, favicon, apple-touch-icon y manifest.
 *
 * Las campañas activas se leen con la clave pública (igual que el sitio).
 */
import { createClient } from "@supabase/supabase-js";

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

  if (expect.jsonLdType) {
    let data: Record<string, unknown> | null = null;
    try {
      data = h.jsonLd.length === 1 ? (JSON.parse(h.jsonLd[0]) as Record<string, unknown>) : null;
    } catch {
      data = null;
    }
    const ldProblems: string[] = [];
    if (!data) ldProblems.push(`JSON-LD inválido o ausente (${h.jsonLd.length} bloques)`);
    else {
      if (data["@context"] !== "https://schema.org") ldProblems.push("@context");
      if (data["@type"] !== expect.jsonLdType) ldProblems.push(`@type ${String(data["@type"])}`);
      if (expect.jsonLdType === "NGO") {
        for (const k of ["name", "url", "logo", "contactPoint"]) if (!data[k]) ldProblems.push(`sin ${k}`);
        if (!Array.isArray(data.sameAs) || data.sameAs.length === 0) ldProblems.push("sin sameAs");
        if (typeof data.logo === "string" && !isAbsolute(data.logo)) ldProblems.push("logo no absoluto");
        const cp = data.contactPoint as Record<string, unknown> | undefined;
        if (cp && cp["@type"] !== "ContactPoint") ldProblems.push("contactPoint sin @type");
      } else {
        for (const k of ["name", "url", "description"]) if (!data[k]) ldProblems.push(`sin ${k}`);
        if (data.url !== `${SITE}${pathname}`) ldProblems.push(`url ${String(data.url)}`);
        const action = data.potentialAction as Record<string, unknown> | undefined;
        if (action?.["@type"] !== "DonateAction") ldProblems.push("sin DonateAction");
        if (action?.target !== expect.donationUrl) ldProblems.push(`target ${String(action?.target)}`);
        if ((action?.recipient as Record<string, unknown> | undefined)?.["@type"] !== "NGO") ldProblems.push("recipient");
      }
    }
    check(`${label}: JSON-LD ${expect.jsonLdType}`, ldProblems.length === 0, ldProblems.join("; ") || undefined);
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
