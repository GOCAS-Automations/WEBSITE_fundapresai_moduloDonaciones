/**
 * Utilidades de navegador para los scripts (capturas, chequeos y pruebas del
 * panel). Usan el Chrome instalado con playwright-core; ruta en CHROME_PATH.
 */
import { createRequire } from "node:module";
import type { Page } from "playwright-core";
import sharp from "sharp";

const require = createRequire(__filename);

export const CHROME =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

/** Solo localhost: las auditorías automatizadas nunca se corren contra producción. */
export function assertLocalhost(base: string): void {
  const host = new URL(base).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    console.error(`Solo se permite localhost (recibido: ${host}). Nunca se audita producción.`);
    process.exit(1);
  }
}

/** Recorre la página para que carguen las imágenes diferidas y espera a que terminen. */
export async function settle(page: Page) {
  await page.evaluate(async () => {
    // Sin desplazamiento suave: la captura debe tomarse arriba del todo.
    document.documentElement.style.scrollBehavior = "auto";
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete && img.loading !== "lazy")
        .map((img) => new Promise((r) => img.addEventListener("load", r, { once: true }))),
    );
  });
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

/**
 * Captura de página completa por tramos y unida con sharp: Chrome no pinta bien
 * de una sola vez páginas de más de ~16 000 px físicos (en celular a 2× se repite
 * el principio de la página al final).
 */
export async function fullPageShot(page: Page, file: string, width: number) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const scale = await page.evaluate(() => window.devicePixelRatio);
  const step = 3000;
  const parts: { input: Buffer; top: number; left: number }[] = [];
  for (let y = 0; y < height; y += step) {
    const h = Math.min(step, height - y);
    const input = await page.screenshot({ fullPage: true, clip: { x: 0, y, width, height: h } });
    parts.push({ input, top: Math.round(y * scale), left: 0 });
  }
  await sharp({
    create: { width: Math.round(width * scale), height: Math.round(height * scale), channels: 3, background: "#ffffff" },
  })
    .composite(parts)
    .png()
    .toFile(file);
}

export type CheckResult = {
  overflow: { scrollWidth: number; clientWidth: number; offenders: string[] };
  h1Count: number;
  smallText: string[];
  smallTargets: string[];
};

export async function runChecks(page: Page): Promise<CheckResult> {
  return page.evaluate(() => {
    const describe = (el: Element) => {
      const id = el.id ? `#${el.id}` : "";
      const cls = typeof el.className === "string" ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}` : "";
      const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
      return `${el.tagName.toLowerCase()}${id}${cls} «${text}»`;
    };
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      // Lo recortado con .sr-only (solo lectores de pantalla) no cuenta.
      const clipped = s.clip === "rect(0px, 0px, 0px, 0px)" || s.clipPath === "inset(50%)";
      return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && !clipped;
    };
    const vw = document.documentElement.clientWidth;

    const offenders: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.left < -1) {
        // Solo cuenta si ningún ancestro recorta el desborde.
        let clipped = false;
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const o = getComputedStyle(p);
          if (o.overflowX !== "visible" || o.overflow === "hidden" || o.overflow === "clip") {
            clipped = true;
            break;
          }
        }
        if (!clipped) offenders.push(describe(el));
      }
    }

    const smallText = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || !n.textContent?.trim() || !visible(el)) continue;
      if (el.closest("[aria-hidden='true'], script, style, noscript")) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 16) smallText.add(`${size}px ${describe(el)}`);
    }

    const smallTargets = new Set<string>();
    for (const el of Array.from(document.querySelectorAll("a[href], button, [role='button'], summary, input, select, textarea"))) {
      if (!visible(el)) continue;
      // Casillas y radios: el área táctil es la etiqueta que los envuelve.
      const isToggle = el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio");
      const r = (isToggle && el.closest("label")) ? el.closest("label")!.getBoundingClientRect() : el.getBoundingClientRect();
      if (r.width < 48 || r.height < 48) smallTargets.add(`${Math.round(r.width)}×${Math.round(r.height)} ${describe(el)}`);
    }

    return {
      overflow: { scrollWidth: document.documentElement.scrollWidth, clientWidth: vw, offenders: offenders.slice(0, 8) },
      h1Count: document.querySelectorAll("h1").length,
      smallText: [...smallText].slice(0, 10),
      smallTargets: [...smallTargets].slice(0, 10),
    };
  });
}

export async function runAxe(page: Page) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(async () => {
    // @ts-expect-error axe se inyecta en la página.
    const r = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
    });
    return r.violations.map((v: { id: string; impact: string; help: string; nodes: { target: string[] }[] }) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      count: v.nodes.length,
      first: v.nodes[0]?.target.join(" "),
    }));
  });
  return result as { id: string; impact: string; help: string; count: number; first: string }[];
}
