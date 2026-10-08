/**
 * Capturas y chequeos visuales/accesibilidad contra el sitio LOCAL.
 *
 * Uso:
 *   npm run shots                                  # capturas 375 y 1440 + chequeos
 *   npm run shots -- --out ../Capturas/fase2 --name landing --path /
 *   npm run shots -- --widths 375,768,1440 --no-check
 *   npm run shots -- --axe                         # además, axe-core (WCAG 2.2 AA)
 *   npm run shots -- --out ../Capturas/fase3 --pages "privacidad=/privacidad,404=/no-existe"
 *                                                  # varias páginas en una sola corrida
 *
 * En Git Bash, anteponga MSYS_NO_PATHCONV=1 (si no, convierte «/ruta» en una
 * ruta de Windows). En PowerShell no hace falta.
 *
 * Barra fija de «Donar» (celular): en la captura de página completa se dibuja
 * al final del documento, donde queda al llegar abajo (así se ve que no tapa
 * el pie); además se guarda la primera pantalla tal cual (<nombre>-<ancho>-pantalla.png).
 *
 * Chequeos (a 320, 375, 768, 1024 y 1440 px, y 1440 px con zoom al 200 %):
 *   - scroll horizontal (y qué elementos se salen),
 *   - un solo <h1>,
 *   - texto de menos de 16 px,
 *   - elementos tocables de menos de 48×48 px,
 *   - con la barra fija de «Donar»: que al llegar al final no tape el pie.
 *
 * Usa el Chrome instalado (playwright-core, sin descargar navegadores).
 * Ruta configurable con CHROME_PATH. Solo acepta localhost: las auditorías
 * automatizadas nunca se corren contra producción.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";

import { assertLocalhost, CHROME, fullPageShot, runAxe, runChecks, settle } from "./lib/browser";

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const BASE = arg("url", "http://localhost:3000")!.replace(/\/+$/, "");
const OUT = path.resolve(arg("out", path.join("..", "Capturas", "fase2"))!);
/** Páginas: --pages "nombre=/ruta,otra=/ruta2" o, por compatibilidad, --name y --path. */
const PAGES = (arg("pages") ?? `${arg("name", "landing")}=${arg("path", "/")}`).split(",").map((pair) => {
  const [name, ...rest] = pair.split("=");
  return { name: name.trim(), path: rest.join("=").trim() || "/" };
});
const SHOT_WIDTHS = arg("widths", "375,1440")!.split(",").map(Number);
const CHECK_WIDTHS = [320, 375, 768, 1024, 1440];

assertLocalhost(BASE);

/** Barra fija (celular): ¿tapa el pie al llegar al final de la página? */
async function donateBarOverlap(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    const bar = document.querySelector("[data-donate-bar]");
    if (!bar || getComputedStyle(bar).display === "none") return null;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((r) => setTimeout(r, 150));
    const barTop = bar.getBoundingClientRect().top;
    const footer = document.querySelector("footer");
    const last = footer?.lastElementChild ?? footer;
    const bottom = last?.getBoundingClientRect().bottom ?? 0;
    window.scrollTo(0, 0);
    return bottom > barTop + 1 ? `la barra fija tapa el pie (${Math.round(bottom - barTop)} px)` : null;
  });
}

/** Capturas y chequeos de una página. Devuelve el número de problemas. */
async function processPage(browser: Browser, name: string, pagePath: string): Promise<number> {
  const url = `${BASE}${pagePath}`;
  let problems = 0;
  console.log(`\n== ${name} (${pagePath})`);

  for (const width of SHOT_WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: width < 768 ? 812 : 900 },
      deviceScaleFactor: width < 768 ? 2 : 1,
      locale: "es-CO",
    });
    await context.addInitScript("window.__name = (f) => f;");
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await settle(page);
    if (await page.locator("[data-donate-bar]").isVisible()) {
      // Primera pantalla tal cual la ve la persona, con la barra abajo.
      await page.screenshot({ path: path.join(OUT, `${name}-${width}-pantalla.png`) });
      // En la página completa, la barra va al final del documento (donde queda al llegar abajo).
      await page.addStyleTag({ content: "body{position:relative}[data-donate-bar]{position:absolute!important}" });
    }
    const file = path.join(OUT, `${name}-${width}.png`);
    await fullPageShot(page, file, width);
    console.log(`Captura: ${file}`);
    await context.close();
  }

  if (flag("no-check")) return problems;
  const cases = [
    ...CHECK_WIDTHS.map((w) => ({ label: `${w} px`, width: w, scale: 1 })),
    { label: "1440 px con zoom 200 %", width: 720, scale: 2 },
  ];
  for (const c of cases) {
    const context = await browser.newContext({
      viewport: { width: c.width, height: 900 },
      deviceScaleFactor: c.scale,
      locale: "es-CO",
    });
    // tsx (esbuild) envuelve las funciones con __name(); en el navegador no existe.
    await context.addInitScript("window.__name = (f) => f;");
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    const r = await runChecks(page);
    const overflow = r.overflow.scrollWidth > r.overflow.clientWidth;
    const issues = [
      overflow && `scroll horizontal (${r.overflow.scrollWidth} > ${r.overflow.clientWidth}): ${r.overflow.offenders.join(" | ")}`,
      r.h1Count !== 1 && `${r.h1Count} h1`,
      r.smallText.length > 0 && `texto < 16 px: ${r.smallText.join(" | ")}`,
      r.smallTargets.length > 0 && `tocables < 48 px: ${r.smallTargets.join(" | ")}`,
      await donateBarOverlap(page),
    ].filter(Boolean);
    problems += issues.length;
    console.log(`${c.label}: ${issues.length ? issues.join("\n    ") : "OK"}`);

    if (flag("axe") && (c.width === 375 || c.width === 1440)) {
      const violations = await runAxe(page);
      problems += violations.length;
      console.log(
        `  axe ${c.label}: ${
          violations.length
            ? violations.map((v) => `${v.impact} ${v.id} ×${v.count} (${v.first})`).join("\n    ")
            : "sin violaciones"
        }`,
      );
    }
    await context.close();
  }
  return problems;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  let problems = 0;
  try {
    for (const { name, path: pagePath } of PAGES) problems += await processPage(browser, name, pagePath);
  } finally {
    await browser.close();
  }
  console.log(problems > 0 ? `\n${problems} problema(s).` : "\nSin problemas.");
  if (problems > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
