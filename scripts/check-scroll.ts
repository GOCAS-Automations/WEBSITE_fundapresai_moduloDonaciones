/**
 * Prueba de desplazamiento al navegar y del botón «Donar» del header (fase 6),
 * contra el sitio LOCAL en producción (`npm run build` + `npm run start`), a
 * 375 y 1440 px.
 *
 * Uso:  npm run check:scroll [-- --reps 20] [-- --widths 375,1440] [-- --only ver-detalles,otras,privacidad,anclas,donar]
 *
 * Casos (los de navegación se repiten --reps veces, con el desplazamiento
 * inicial a distintas alturas):
 *  - ver-detalles: en la landing, «Ver detalles» → la campaña aterriza ARRIBA
 *    al instante (scrollY = 0 en el primer cuadro: sin animación que la
 *    persona pueda cortar al tocar la pantalla) y sigue arriba aunque la
 *    persona mueva la rueda/dedo justo después; «Atrás» → la posición anterior.
 *  - otras: «Otras campañas» al final del detalle (/campanas/a → /campanas/b,
 *    mismo segmento) → igual que arriba.
 *  - privacidad: «Política de privacidad» del pie (al fondo) → arriba;
 *    «Volver al inicio» → la landing arriba.
 *  - anclas: «Volver a campañas» (/#campanas) desde un detalle y «Ver campañas»
 *    del hero (dos veces) → la sección Campañas queda justo bajo el header.
 *  - donar: «Donar» del header. Landing (arriba, cerca, en la sección, al
 *    fondo y con #campanas ya puesto): lleva a Campañas y el foco pasa al
 *    título; con prefers-reduced-motion, sin animación. Celular: «Campañas»
 *    del menú hace lo mismo. Detalle: abre la donación de ESA campaña (con
 *    UTM, misma pestaña; Donar Online se simula, no se sale a internet) y
 *    «Atrás» desde allí vuelve a la misma posición del detalle.
 *    Privacidad y 404: /#campanas, aterriza en la sección y enfoca el título.
 *
 * Solo localhost (nunca producción). Usa el Chrome instalado (CHROME_PATH).
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";

import { assertLocalhost, CHROME } from "./lib/browser";

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BASE = arg("url", "http://localhost:3000").replace(/\/+$/, "");
const REPS = Number(arg("reps", "20"));
const WIDTHS = arg("widths", "375,1440").split(",").map(Number);
const ONLY = arg("only", "ver-detalles,otras,privacidad,anclas,donar").split(",");
/** «Atrás»: margen por si una imagen termina de cargar después de restaurar. */
const BACK_TOLERANCE = 3;
assertLocalhost(BASE);

type Sample = { ok: boolean; info: string };
const results: { name: string; ok: boolean; detail: string }[] = [];
function record(name: string, values: Sample[]) {
  const bad = values.filter((v) => !v.ok);
  const detail = bad.length
    ? `${bad.length}/${values.length} mal: ${bad.slice(0, 4).map((v) => v.info).join(" | ")}`
    : `${values.length}/${values.length} bien${values[0]?.info ? ` (p. ej. ${values[values.length - 1].info})` : ""}`;
  results.push({ name, ok: bad.length === 0, detail });
  console.log(`${bad.length ? "✗" : "✓"} ${name}: ${detail}`);
}

/** Espera a que el desplazamiento se quede quieto (≥ 600 ms sin moverse) y devuelve scrollY. */
async function stableScrollY(page: Page, timeout = 6000): Promise<number> {
  return page.evaluate(async (limit) => {
    const start = performance.now();
    let last = window.scrollY;
    let since = performance.now();
    while (performance.now() - start < limit) {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const y = window.scrollY;
      if (Math.abs(y - last) > 0.5) {
        last = y;
        since = performance.now();
      } else if (performance.now() - since > 600) return y;
    }
    return window.scrollY;
  }, timeout);
}

/**
 * Guarda scrollY en el momento exacto del clic (sessionStorage: sobrevive a salir a otro sitio).
 * Playwright puede mover la página antes de hacer clic si el objetivo no está del todo libre;
 * «Atrás» debe volver a donde estaba la persona al tocar, no a donde se la dejó antes.
 */
async function armClickY(page: Page) {
  await page.evaluate(() =>
    document.addEventListener("click", () => sessionStorage.setItem("prueba:clickY", String(window.scrollY)), { capture: true, once: true }),
  );
}
async function clickY(page: Page): Promise<number> {
  return page.evaluate(() => Number(sessionStorage.getItem("prueba:clickY")));
}

/** scrollY en el siguiente cuadro (lo que la persona ve apenas aparece la página nueva). */
async function nextFrameScrollY(page: Page): Promise<number> {
  return page.evaluate(() => new Promise<number>((r) => requestAnimationFrame(() => r(window.scrollY))));
}

/** Desplaza (sin animación) para que el elemento quede a `viewportY` px del borde superior. */
async function placeAt(page: Page, selector: string, index: number, viewportY: number): Promise<number> {
  return page.evaluate(
    ({ selector, index, viewportY }) => {
      const el = document.querySelectorAll(selector)[index] as HTMLElement | undefined;
      if (!el) throw new Error(`No existe ${selector} [${index}]`);
      const top = el.getBoundingClientRect().top + window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: Math.max(0, Math.min(max, top - viewportY)), behavior: "instant" });
      return window.scrollY;
    },
    { selector, index, viewportY },
  );
}

async function scrollToY(page: Page, y: number | "bottom") {
  await page.evaluate((target) => {
    const top = target === "bottom" ? document.documentElement.scrollHeight : target;
    window.scrollTo({ top, behavior: "instant" });
  }, y);
  await page.waitForTimeout(120);
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

/** Posición «al azar» pero repetible del elemento en la pantalla (entre el header y el borde inferior). */
function viewportYFor(rep: number, height: number, bottomReserve: number) {
  const frac = (rep * 0.618) % 1;
  return Math.round(130 + frac * Math.max(0, height - 130 - bottomReserve - 70));
}

/** Header del sitio (el detalle tiene además un <header> propio dentro de main). */
const siteHeader = (page: Page) => page.locator("body > header");

/** ¿La sección Campañas quedó justo debajo del header (título visible, sin taparse)? ¿Tiene el foco su título? */
async function campaignsLanded(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector("body > header")!.getBoundingClientRect().bottom;
    const section = document.getElementById("campanas")!.getBoundingClientRect().top;
    const title = document.getElementById("campanas-title")!.getBoundingClientRect();
    return {
      ok: section >= header - 2 && section <= header + 24 && title.top >= header && title.bottom <= window.innerHeight,
      info: `sección a ${Math.round(section)} px (header ${Math.round(header)} px)`,
      focus: document.activeElement?.id || document.activeElement?.tagName || "",
    };
  });
}

/**
 * Clic en un enlace que navega a `path`. Mide scrollY en el primer cuadro y,
 * si `interrupt`, simula que la persona mueve la rueda (o el dedo) justo después.
 */
async function navigate(page: Page, click: () => Promise<void>, path: string, interrupt: boolean) {
  await click();
  await page.waitForURL((u) => u.pathname === path);
  const first = await nextFrameScrollY(page);
  if (interrupt) {
    await page.waitForTimeout(150);
    await page.mouse.wheel(0, -40);
  }
  const final = await stableScrollY(page);
  return { first, final };
}

async function caseVerDetalles(page: Page, width: number) {
  const height = page.viewportSize()!.height;
  const forward: Sample[] = [];
  const back: Sample[] = [];
  await page.goto(`${BASE}/`);
  await settle(page);
  const selector = "#campanas a[href^='/campanas/']";
  const buttons = await page.locator(selector).count();
  for (let rep = 0; rep < REPS; rep++) {
    const index = rep % buttons;
    await placeAt(page, selector, index, viewportYFor(rep, height, 0));
    await page.waitForTimeout(80);
    const link = page.locator(selector).nth(index);
    const href = (await link.getAttribute("href"))!;
    const interrupt = rep % 2 === 1;
    await armClickY(page);
    const { first, final } = await navigate(page, () => link.click(), href, interrupt);
    const before = await clickY(page);
    forward.push({
      ok: first <= 1 && final <= 1,
      info: `${href} desde ${Math.round(before)}: primer cuadro ${Math.round(first)}, final ${Math.round(final)}${interrupt ? " (con toque)" : ""}`,
    });
    await page.goBack();
    await page.waitForURL((u) => u.pathname === "/");
    const yBack = await stableScrollY(page);
    back.push({ ok: Math.abs(yBack - before) <= BACK_TOLERANCE, info: `esperado ${Math.round(before)}, quedó ${Math.round(yBack)}` });
  }
  record(`[${width}] landing → «Ver detalles» aterriza arriba al instante`, forward);
  record(`[${width}] «Atrás» vuelve a la posición de la landing (±${BACK_TOLERANCE} px)`, back);
}

async function caseOtras(page: Page, width: number) {
  const height = page.viewportSize()!.height;
  const forward: Sample[] = [];
  const back: Sample[] = [];
  await page.goto(`${BASE}/`);
  const slugs = await page.locator("#campanas a[href^='/campanas/']").evaluateAll((els) => els.map((e) => e.getAttribute("href")!));
  const selector = "section[aria-labelledby='otras-campanas-title'] a[href^='/campanas/']";
  await page.goto(`${BASE}${slugs[0]}`);
  await settle(page);
  for (let rep = 0; rep < REPS; rep++) {
    const from = new URL(page.url()).pathname;
    const visible = await page.locator(selector).evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).length);
    const index = rep % visible;
    const bar = await page.evaluate(() => {
      const el = document.querySelector("[data-donate-bar]") as HTMLElement | null;
      return el && getComputedStyle(el).display !== "none" ? el.getBoundingClientRect().height : 0;
    });
    await placeAt(page, selector, index, viewportYFor(rep, height, bar));
    await page.waitForTimeout(80);
    const link = page.locator(selector).nth(index);
    const href = (await link.getAttribute("href"))!;
    const interrupt = rep % 2 === 1;
    await armClickY(page);
    const { first, final } = await navigate(page, () => link.click(), href, interrupt);
    const before = await clickY(page);
    forward.push({
      ok: first <= 1 && final <= 1,
      info: `${from} → ${href} desde ${Math.round(before)}: primer cuadro ${Math.round(first)}, final ${Math.round(final)}${interrupt ? " (con toque)" : ""}`,
    });
    if (rep % 2 === 0) {
      await page.goBack();
      await page.waitForURL((u) => u.pathname === from);
      const yBack = await stableScrollY(page);
      back.push({ ok: Math.abs(yBack - before) <= BACK_TOLERANCE, info: `${from}: esperado ${Math.round(before)}, quedó ${Math.round(yBack)}` });
    }
  }
  record(`[${width}] «Otras campañas» (/campanas/a → /campanas/b) aterriza arriba al instante`, forward);
  record(`[${width}] «Atrás» vuelve a la posición del detalle anterior (±${BACK_TOLERANCE} px)`, back);
}

async function casePrivacidad(page: Page, width: number) {
  const toPrivacy: Sample[] = [];
  const toHome: Sample[] = [];
  const reps = Math.max(2, Math.round(REPS / 4));
  for (let rep = 0; rep < reps; rep++) {
    const start = rep % 2 === 0 ? "/" : "/campanas/unidos-por-su-educacion";
    await page.goto(`${BASE}${start}`);
    await settle(page);
    await scrollToY(page, "bottom");
    const a = await navigate(page, () => page.locator("footer a[href='/privacidad']").click(), "/privacidad", rep % 2 === 1);
    toPrivacy.push({ ok: a.first <= 1 && a.final <= 1, info: `${start} → /privacidad: ${Math.round(a.first)} / ${Math.round(a.final)}` });
    await scrollToY(page, 400);
    const b = await navigate(page, () => page.getByRole("link", { name: "Volver al inicio" }).click(), "/", rep % 2 === 0);
    toHome.push({ ok: b.first <= 1 && b.final <= 1, info: `/privacidad → /: ${Math.round(b.first)} / ${Math.round(b.final)}` });
  }
  record(`[${width}] pie → privacidad aterriza arriba`, toPrivacy);
  record(`[${width}] privacidad → landing aterriza arriba`, toHome);
}

async function caseAnclas(page: Page, width: number) {
  const back: Sample[] = [];
  const hero: Sample[] = [];
  const reps = Math.max(2, Math.round(REPS / 4));
  for (let rep = 0; rep < reps; rep++) {
    await page.goto(`${BASE}/campanas/unidos-por-su-educacion`);
    await settle(page);
    await scrollToY(page, rep % 2 ? 300 : 0);
    await page.getByRole("link", { name: "Volver a campañas" }).click();
    await page.waitForURL((u) => u.pathname === "/" && u.hash === "#campanas");
    await stableScrollY(page);
    const landed = await campaignsLanded(page);
    back.push({ ok: landed.ok && landed.focus === "campanas-title", info: `${landed.info}, foco ${landed.focus}` });

    // «Ver campañas» del hero, dos veces (la segunda con el #campanas ya puesto).
    for (let i = 0; i < 2; i++) {
      await scrollToY(page, 0);
      await page.getByRole("link", { name: "Ver campañas" }).click();
      await stableScrollY(page);
      const h = await campaignsLanded(page);
      hero.push({ ok: h.ok && h.focus === "campanas-title", info: `vez ${i + 1}: ${h.info}, foco ${h.focus}` });
    }
  }
  record(`[${width}] «Volver a campañas» (/#campanas) aterriza en la sección y enfoca el título`, back);
  record(`[${width}] «Ver campañas» del hero funciona también la segunda vez`, hero);
}

async function caseDonar(context: BrowserContext, page: Page, width: number) {
  const donar = () => siteHeader(page).getByRole("link", { name: /^Donar/ });
  // Donar Online simulado: la prueba nunca sale a internet.
  await context.route(/donaronline\.org/, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Donar Online (simulado)</title><p>ok</p>" }),
  );

  // Landing.
  const landing: Sample[] = [];
  await page.goto(`${BASE}/`);
  await settle(page);
  const positions: { label: string; y: () => Promise<number | "bottom"> }[] = [
    { label: "arriba", y: async () => 0 },
    { label: "mitad del hero", y: async () => 250 },
    { label: "ya cerca", y: async () => (await page.evaluate(() => document.getElementById("campanas")!.offsetTop)) - 140 },
    { label: "en la sección", y: async () => (await page.evaluate(() => document.getElementById("campanas")!.offsetTop)) + 500 },
    { label: "al fondo", y: async () => "bottom" },
  ];
  for (let rep = 0; rep < REPS; rep++) {
    const p = positions[rep % positions.length];
    const withHash = rep % 2 === 1;
    if (withHash) await page.evaluate(() => history.replaceState(history.state, "", "/#campanas"));
    else await page.evaluate(() => history.replaceState(history.state, "", "/"));
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await scrollToY(page, await p.y());
    await donar().click();
    await stableScrollY(page);
    const landed = await campaignsLanded(page);
    landing.push({
      ok: landed.ok && landed.focus === "campanas-title" && new URL(page.url()).pathname === "/",
      info: `${p.label}${withHash ? " con #campanas" : ""}: ${landed.info}, foco ${landed.focus}`,
    });
  }
  record(`[${width}] landing: «Donar» lleva a Campañas y enfoca su título`, landing);

  // Movimiento reducido: sin animación (en el primer cuadro ya está en la sección).
  await page.emulateMedia({ reducedMotion: "reduce" });
  await scrollToY(page, 0);
  await donar().click();
  const firstFrame = await page.evaluate(
    () =>
      new Promise<number>((r) =>
        requestAnimationFrame(() => r(Math.round(document.getElementById("campanas")!.getBoundingClientRect().top))),
      ),
  );
  const header = await page.evaluate(() => Math.round(document.querySelector("body > header")!.getBoundingClientRect().bottom));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  record(`[${width}] landing con prefers-reduced-motion: llega sin animación`, [
    { ok: Math.abs(firstFrame - header) <= 2, info: `primer cuadro: sección a ${firstFrame} px (header ${header} px)` },
  ]);

  // Celular: «Campañas» del menú.
  if (width < 1024) {
    const menu: Sample[] = [];
    for (const y of [0, "bottom" as const]) {
      await scrollToY(page, y);
      await siteHeader(page).getByRole("button", { name: "Menú" }).click();
      await siteHeader(page).getByRole("link", { name: "Campañas" }).click();
      await stableScrollY(page);
      const landed = await campaignsLanded(page);
      const closed = await siteHeader(page).getByRole("button", { name: "Menú" }).isVisible();
      menu.push({ ok: landed.ok && landed.focus === "campanas-title" && closed, info: `desde ${y}: ${landed.info}, foco ${landed.focus}, menú cerrado ${closed}` });
    }
    record(`[${width}] menú del celular: «Campañas» lleva a la sección`, menu);
  }

  // Detalle: dona a esa campaña.
  const detail: Sample[] = [];
  const returned: Sample[] = [];
  const slugs = await page.locator("#campanas a[href^='/campanas/']").evaluateAll((els) => els.map((e) => e.getAttribute("href")!));
  for (const path of slugs) {
    await page.goto(`${BASE}${path}`);
    await settle(page);
    const expected = await page.locator("main a[href*='donaronline.org']").first().getAttribute("href");
    const href = await donar().getAttribute("href");
    const name = await donar().evaluate((el) => el.textContent?.replace(/\s+/g, " ").trim());
    await scrollToY(page, 500);
    const pagesBefore = context.pages().length;
    await armClickY(page);
    // Clic del DOM: Playwright desplazaría la página antes de tocar un botón del header fijo, y
    // Chrome a veces guarda en el historial la posición de antes de ese desplazamiento.
    await donar().evaluate((el) => (el as HTMLElement).click());
    await page.waitForURL(/donaronline\.org/, { timeout: 10000 });
    const sameTab = context.pages().length === pagesBefore;
    const utm = new URL(page.url()).searchParams.get("utm_campaign");
    detail.push({
      ok: href === expected && sameTab && utm === path.split("/").pop() && Boolean(name?.includes("a la campaña")),
      info: `${path}: ${href === expected ? "mismo enlace que «Donar» de la página" : `distinto (${href})`}, utm_campaign=${utm}, misma pestaña=${sameTab}, nombre «${name}»`,
    });
    await page.goBack();
    await page.waitForURL((u) => u.pathname === path);
    await settle(page);
    const yBack = await stableScrollY(page);
    const before = await clickY(page);
    returned.push({ ok: Math.abs(yBack - before) <= BACK_TOLERANCE, info: `${path}: esperado ${Math.round(before)}, quedó ${Math.round(yBack)}` });
  }
  record(`[${width}] detalle: «Donar» del header dona a esa campaña`, detail);
  record(`[${width}] «Atrás» desde Donar Online vuelve a la posición del detalle`, returned);

  // Privacidad y 404: /#campanas.
  const others: Sample[] = [];
  for (const path of ["/privacidad", "/no-existe-esta-pagina", "/campanas/no-existe-esta-campana"]) {
    await page.goto(`${BASE}${path}`);
    await settle(page);
    await scrollToY(page, 200);
    const href = await donar().getAttribute("href");
    await donar().click();
    await page.waitForURL((u) => u.pathname === "/" && u.hash === "#campanas");
    await stableScrollY(page);
    const landed = await campaignsLanded(page);
    others.push({ ok: href === "/#campanas" && landed.ok && landed.focus === "campanas-title", info: `${path}: ${landed.info}, foco ${landed.focus}` });
  }
  record(`[${width}] privacidad y 404: «Donar» lleva a /#campanas`, others);
  await context.unroute(/donaronline\.org/);
}

async function main() {
  const browser: Browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    for (const width of WIDTHS) {
      const mobile = width < 768;
      const context = await browser.newContext({
        viewport: { width, height: mobile ? 740 : 900 },
        deviceScaleFactor: 1,
        isMobile: mobile,
        hasTouch: mobile,
      });
      // tsx (esbuild) envuelve las funciones con __name: se define en la página.
      await context.addInitScript("window.__name = (f) => f;");
      const page = await context.newPage();
      if (ONLY.includes("ver-detalles")) await caseVerDetalles(page, width);
      if (ONLY.includes("otras")) await caseOtras(page, width);
      if (ONLY.includes("privacidad")) await casePrivacidad(page, width);
      if (ONLY.includes("anclas")) await caseAnclas(page, width);
      if (ONLY.includes("donar")) await caseDonar(context, page, width);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(failed.length ? `\n${failed.length} caso(s) con fallas.` : `\nTodo bien (${results.length} casos).`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
