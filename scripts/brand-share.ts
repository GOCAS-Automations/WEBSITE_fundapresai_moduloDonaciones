/**
 * Imágenes de marca para compartir y para buscadores (fase 5):
 *
 *   public/og/fundapresai.jpg      Imagen al compartir la landing (1200×630, JPEG < 300 KB)
 *   public/brand/logo-google.png   Logo para el JSON-LD de la organización (512×512, fondo blanco)
 *   app/favicon.ico                Símbolo en 16, 32 y 48 px (el de 16 px, afinado a mano)
 *   app/icon.png                   Símbolo 192×192 (múltiplo de 48, como pide Google)
 *   app/apple-icon.png             Símbolo 180×180 con fondo sólido (iOS pone negro el transparente)
 *
 * Uso:  npm run brand:share   (requiere el Chrome instalado, CHROME_PATH, e internet para Poppins)
 *
 * La imagen para redes se arma como HTML con Poppins (la letra del sitio) y
 * se fotografía con Chrome; los íconos salen del símbolo vectorial
 * (components/brand/LeafSymbol.tsx), así quedan nítidos en cualquier tamaño.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright-core";
import sharp from "sharp";

import { LEAF_PATHS } from "../components/brand/LeafSymbol";
import { CHROME } from "./lib/browser";
import { ROOT } from "./lib/env";

const W = 1200;
const H = 630;
const MAX_OG_BYTES = 300 * 1024;

const BRAND = {
  purple: "#5f2c85",
  purpleDark: "#4a2168",
  periwinkle: "#7186be",
  terracotta: "#e27945",
  orange: "#e95620",
  pink: "#eebec5",
  cream: "#fcf1dd",
  ink: "#2b2233",
};

/** El símbolo (hojas + círculo) como SVG, con un viewBox cuadrado opcional y relleno alrededor. */
function symbolSvg({ size, pad = 0, background }: { size: number; pad?: number; background?: string }) {
  // viewBox original: 0 0 286 207 → cuadrado centrado.
  const side = 286 + pad * 2;
  const y = (207 - side) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-pad} ${y} ${side} ${side}">
    ${background ? `<rect x="${-pad}" y="${y}" width="${side}" height="${side}" fill="${background}"/>` : ""}
    <path fill="${BRAND.purple}" d="${LEAF_PATHS.purple}"/>
    <path fill="${BRAND.periwinkle}" d="${LEAF_PATHS.periwinkle}"/>
    <path fill="${BRAND.terracotta}" d="${LEAF_PATHS.terracotta}"/>
  </svg>`;
}

const leavesGroup = (fill: { purple: string; periwinkle: string; terracotta: string }) =>
  `<path fill="${fill.purple}" d="${LEAF_PATHS.purple}"/><path fill="${fill.periwinkle}" d="${LEAF_PATHS.periwinkle}"/><path fill="${fill.terracotta}" d="${LEAF_PATHS.terracotta}"/>`;

const dataUri = (file: string, type = "image/png") =>
  `data:${type};base64,${readFileSync(path.join(ROOT, file)).toString("base64")}`;

/** HTML de la imagen para redes (1200×630). */
function ogHtml() {
  const logo = dataUri("public/brand/logo-vertical.png");
  const soft = { purple: "#ffffff", periwinkle: "#ffffff", terracotta: "#ffffff" };
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=block" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px;overflow:hidden}
  body{font-family:Poppins,sans-serif;color:#fff;position:relative;
    background:
      radial-gradient(640px 420px at 100% 0%, rgba(238,190,197,.30) 0%, transparent 70%),
      radial-gradient(560px 420px at 62% 118%, rgba(113,134,190,.38) 0%, transparent 70%),
      linear-gradient(135deg, ${BRAND.purple} 0%, ${BRAND.purpleDark} 100%);}
  .motif{position:absolute;right:-150px;bottom:-120px;width:760px;opacity:.07}
  .motif2{position:absolute;left:270px;top:-140px;width:330px;opacity:.05;transform:rotate(180deg)}
  .card{position:absolute;left:64px;top:64px;width:420px;height:502px;border-radius:44px;background:#fff;
    box-shadow:0 30px 60px -20px rgba(20,6,32,.55),0 0 0 1px rgba(255,255,255,.4) inset;display:grid;place-items:center}
  .card img{width:340px;height:auto}
  .copy{position:absolute;left:540px;right:64px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center}
  .eyebrow{font-weight:500;font-size:22px;letter-spacing:.14em;text-transform:uppercase;color:${BRAND.pink}}
  h1{margin-top:18px;font-weight:600;font-size:54px;line-height:1.12;letter-spacing:-.02em}
  h1 em{font-style:normal;color:#ffd9c7}
  p{margin-top:22px;font-size:24px;line-height:1.45;color:rgba(255,255,255,.86);max-width:560px}
  .pill{margin-top:34px;display:inline-flex;align-items:center;gap:12px;align-self:flex-start;
    background:${BRAND.orange};color:#fff;font-weight:600;font-size:24px;padding:16px 30px;border-radius:999px;
    box-shadow:0 12px 28px -10px rgba(0,0,0,.45)}
  .bar{position:absolute;left:0;right:0;bottom:0;height:10px;
    background:linear-gradient(90deg, ${BRAND.pink} 0 33.4%, ${BRAND.periwinkle} 33.4% 66.7%, ${BRAND.terracotta} 66.7% 100%)}
</style></head>
<body>
  <svg class="motif" viewBox="0 0 286 207">${leavesGroup(soft)}</svg>
  <svg class="motif2" viewBox="0 0 286 207">${leavesGroup(soft)}</svg>
  <div class="card"><img src="${logo}" alt=""></div>
  <div class="copy">
    <div class="eyebrow">Fundación Fundapresai</div>
    <h1>¿Se siente inspirado? <em>Su aporte transformará vidas.</em></h1>
    <p>Educación gratuita y en valores para niños y niñas del Colegio Sathya Sai de Funza.</p>
    <div class="pill">Elija una campaña y done&nbsp;→</div>
  </div>
  <div class="bar"></div>
</body></html>`;
}

/** Coloca un PNG centrado en un cuadrado. */
async function squareFrom(svg: string, size: number) {
  return sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
}

/** ICO con PNG embebidos (válido en todos los navegadores actuales). */
function buildIco(pngs: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries: Buffer[] = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

/**
 * Favicon de 16 px: a ese tamaño las puntas de las hojas no se ven y solo
 * restan tamaño. Se recortan un poco (relleno negativo) para que el símbolo
 * ocupe más píxeles, y se reduce desde 256 px con lanczos3: comparado con
 * dibujarlo directo a 16 px o con enfoque extra, es el que deja los colores
 * más sólidos (hojas moradas, círculo y hojas inferiores se distinguen).
 */
async function favicon16(): Promise<Buffer> {
  const big = await sharp(Buffer.from(symbolSvg({ size: 256, pad: -10 }))).png().toBuffer();
  return sharp(big).resize(16, 16, { kernel: "lanczos3" }).png({ compressionLevel: 9 }).toBuffer();
}

async function main() {
  const only = process.argv.includes("--og-only");
  const out = (p: string) => {
    const full = path.join(ROOT, p);
    mkdirSync(path.dirname(full), { recursive: true });
    return full;
  };

  // 1. Imagen para redes.
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await page.setContent(ogHtml(), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const fontOk = await page.evaluate(() => document.fonts.check('600 54px "Poppins"'));
    if (!fontOk) throw new Error("No cargó Poppins (¿sin internet?): la imagen saldría con otra letra.");
    const png = await page.screenshot({ type: "png" });
    let quality = 86;
    let jpeg = await sharp(png).jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:4:4" }).toBuffer();
    while (jpeg.length > MAX_OG_BYTES && quality > 60) {
      quality -= 4;
      jpeg = await sharp(png).jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:4:4" }).toBuffer();
    }
    writeFileSync(out("public/og/fundapresai.jpg"), jpeg);
    console.log(`public/og/fundapresai.jpg: ${W}×${H}, ${(jpeg.length / 1024).toFixed(0)} KB (calidad ${quality})`);
  } finally {
    await browser.close();
  }
  if (only) return;

  // 2. Logo para Google (JSON-LD): logo vertical sin el lema, centrado en blanco.
  const logo = await sharp(path.join(ROOT, "public/brand/logo-vertical-sin-lema.png"))
    .resize(400, 400, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 3, background: "#ffffff" } })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(out("public/brand/logo-google.png"));

  // 3. Favicon .ico (16, 32, 48) y PNG de 192.
  const ico = buildIco([
    { size: 16, data: await favicon16() },
    { size: 32, data: await squareFrom(symbolSvg({ size: 32, pad: 4 }), 32) },
    { size: 48, data: await squareFrom(symbolSvg({ size: 48, pad: 8 }), 48) },
  ]);
  writeFileSync(out("app/favicon.ico"), ico);
  writeFileSync(out("app/icon.png"), await squareFrom(symbolSvg({ size: 192, pad: 18 }), 192));

  // 4. apple-icon: fondo blanco sólido (sin transparencia) y margen generoso.
  const apple = await sharp(Buffer.from(symbolSvg({ size: 180, pad: 62, background: "#ffffff" })))
    .resize(180, 180)
    .flatten({ background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(out("app/apple-icon.png"), apple);

  console.log("Listo: logo-google.png, favicon.ico (16/32/48), icon.png (192) y apple-icon.png (180, opaco).");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
