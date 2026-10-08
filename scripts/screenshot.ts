/**
 * Capturas y chequeos visuales/accesibilidad contra el sitio LOCAL.
 *
 * Uso:
 *   npm run shots                                  # capturas 375 y 1440 + chequeos
 *   npm run shots -- --out ../Capturas/fase2 --name landing --path /
 *   npm run shots -- --widths 375,768,1440 --no-check
 *   npm run shots -- --axe                         # además, axe-core (WCAG 2.2 AA)
 *
 * Chequeos (a 320, 375, 768, 1024 y 1440 px, y 1440 px con zoom al 200 %):
 *   - scroll horizontal (y qué elementos se salen),
 *   - un solo <h1>,
 *   - texto de menos de 16 px,
 *   - elementos tocables de menos de 48×48 px.
 *
 * Usa el Chrome instalado (playwright-core, sin descargar navegadores).
 * Ruta configurable con CHROME_PATH. Solo acepta localhost: las auditorías
 * automatizadas nunca se corren contra producción.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

import { assertLocalhost, CHROME, fullPageShot, runAxe, runChecks, settle } from "./lib/browser";

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const BASE = arg("url", "http://localhost:3000")!.replace(/\/+$/, "");
const PAGE_PATH = arg("path", "/")!;
const OUT = path.resolve(arg("out", path.join("..", "Capturas", "fase2"))!);
const NAME = arg("name", "landing")!;
const SHOT_WIDTHS = arg("widths", "375,1440")!.split(",").map(Number);
const CHECK_WIDTHS = [320, 375, 768, 1024, 1440];

assertLocalhost(BASE);

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const url = `${BASE}${PAGE_PATH}`;
  let problems = 0;

  try {
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
      const file = path.join(OUT, `${NAME}-${width}.png`);
      await fullPageShot(page, file, width);
      console.log(`Captura: ${file}`);
      await context.close();
    }

    if (!flag("no-check")) {
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
    }
  } finally {
    await browser.close();
  }
  if (problems > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
