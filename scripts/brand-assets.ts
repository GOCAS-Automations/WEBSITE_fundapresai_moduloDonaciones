/**
 * Genera los logos transparentes, los íconos y la portada provisional a partir
 * del logo VECTORIAL que viene dentro de «Identidad visual Fundapresai.pdf».
 *
 * Uso:  npm run brand:assets
 * Requiere `pdftocairo` (Poppler) en el PATH. Git for Windows lo incluye.
 * Ruta del PDF configurable con BRAND_PDF (por defecto ../Insumos/...).
 *
 * Por qué del PDF y no de los JPEG: los JPEG son pequeños (470×122 y 611×797)
 * y tienen fondo blanco; el PDF trae el logo en vectores, así que se renderiza
 * a 1200 dpi con fondo transparente real (sin halos) y luego se reduce.
 * El PDF fue exportado con conversión de color de macOS, así que los colores
 * se corrigen a los hex exactos del manual de identidad.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(__dirname, "..");
const PDF =
  process.env.BRAND_PDF ??
  path.resolve(ROOT, "..", "Insumos", "Identidad visual Fundapresai.pdf");

// Colores planos que produce el render del PDF → colores oficiales del manual.
const SOURCE = [
  [86, 45, 146], // morado
  [106, 126, 195], // periwinkle
  [227, 106, 63], // terracota (hojas inferiores)
  [241, 76, 38], // naranja (lema)
];
const TARGET = [
  [0x5f, 0x2c, 0x85],
  [0x71, 0x86, 0xbe],
  [0xe2, 0x79, 0x45],
  [0xe9, 0x56, 0x20],
];

const BRAND = {
  purple: "#5f2c85",
  periwinkle: "#7186be",
  pink: "#eebec5",
  cream: "#fcf1dd",
  terracotta: "#e27945",
};

/** Resuelve A·x = b (4×4) por eliminación gaussiana. */
function solve4(A: number[][], b: number[]): number[] {
  const M = A.map((row, i) => [...row, b[i]]);
  const n = 4;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/** Transformación afín de color que lleva SOURCE → TARGET (exacta para 4 pares). */
function colorTransform() {
  const A = SOURCE.map(([r, g, b]) => [r, g, b, 1]);
  return [0, 1, 2].map((ch) => solve4(A, TARGET.map((t) => t[ch])));
}

async function renderLogo(tmp: string): Promise<Buffer> {
  const out = path.join(tmp, "logo");
  // Región del logo en la página (1080×1350 pt) a 1200 dpi y SIN antialias:
  // el suavizado sale del supermuestreo al reducir, y así no aparecen las
  // «costuras» claras entre formas del mismo color que deja el antialias.
  execFileSync("pdftocairo", [
    "-png", "-transp", "-antialias", "none", "-r", "1200",
    "-x", "10200", "-y", "13200", "-W", "6200", "-H", "6000",
    "-singlefile", PDF, out,
  ]);
  const { data, info } = await sharp(`${out}.png`)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const T = colorTransform();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    for (let ch = 0; ch < 3; ch++) {
      const [a, bb, c, d] = T[ch];
      data[i + ch] = Math.max(0, Math.min(255, Math.round(a * r + bb * g + c * b + d)));
    }
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

/** Bandas horizontales con contenido (alpha > umbral), separadas por ≥ minGap filas vacías. */
async function rowBands(img: Buffer, minGap = 8) {
  const { data, info } = await sharp(img).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const filled: boolean[] = [];
  for (let y = 0; y < info.height; y++) {
    let any = false;
    for (let x = 0; x < info.width && !any; x++) any = data[(y * info.width + x) * 4 + 3] > 8;
    filled.push(any);
  }
  const bands: [number, number][] = [];
  let start = -1, gap = 0;
  filled.forEach((f, y) => {
    if (f) {
      if (start < 0) start = y;
      gap = 0;
    } else if (start >= 0 && ++gap >= minGap) {
      bands.push([start, y - gap]);
      start = -1;
    }
  });
  if (start >= 0) bands.push([start, info.height - 1]);
  return { bands, width: info.width };
}

const trim = (b: Buffer) => sharp(b).trim({ threshold: 1 }).png().toBuffer();

async function cropBand(img: Buffer, [y0, y1]: [number, number], width: number) {
  return trim(await sharp(img).extract({ left: 0, top: y0, width, height: y1 - y0 + 1 }).png().toBuffer());
}

/** Coloca `img` centrado en un lienzo cuadrado `size` ocupando `fill` (0–1) del lado. */
async function square(img: Buffer, size: number, fill: number, background?: string) {
  const inner = Math.round(size * fill);
  const resized = await sharp(img)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
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
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

async function main() {
  const tmp = mkdtempSync(path.join(tmpdir(), "fundapresai-brand-"));
  try {
    const vertical = await trim(await renderLogo(tmp));
    const { bands, width } = await rowBands(vertical);
    if (bands.length !== 3) throw new Error(`Se esperaban 3 bandas (símbolo, nombre, lema) y hay ${bands.length}`);
    const [symbol, title, tagline] = await Promise.all(bands.map((b) => cropBand(vertical, b, width)));

    const out = (p: string) => {
      const full = path.join(ROOT, p);
      mkdirSync(path.dirname(full), { recursive: true });
      return full;
    };

    // Logo vertical y símbolo.
    await sharp(vertical).resize({ width: 720 }).png({ compressionLevel: 9 }).toFile(out("public/brand/logo-vertical.png"));
    await sharp(symbol).resize({ width: 512 }).png({ compressionLevel: 9 }).toFile(out("public/brand/simbolo.png"));

    // Logo horizontal con las proporciones del JPEG original (medidas en px del JPEG):
    // símbolo 124×89; nombre 280 de ancho; lema 279; 7 px entre líneas; 20 px entre símbolo y texto.
    const unit = 4; // escala: alto final del símbolo = 89 × 4 = 356 px
    const sym = await sharp(symbol).resize({ height: 89 * unit }).png().toBuffer();
    const symMeta = await sharp(sym).metadata();
    const ttl = await sharp(title).resize({ width: 280 * unit }).png().toBuffer();
    const tag = await sharp(tagline).resize({ width: 279 * unit }).png().toBuffer();
    const ttlH = (await sharp(ttl).metadata()).height!;
    const tagH = (await sharp(tag).metadata()).height!;
    const textH = ttlH + 7 * unit + tagH;
    const symW = symMeta.width!;
    const H = Math.max(89 * unit, textH);
    const textTop = Math.round((H - textH) / 2);
    const textLeft = symW + 20 * unit;
    await sharp({
      create: { width: textLeft + 280 * unit, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        { input: sym, left: 0, top: Math.round((H - 89 * unit) / 2) },
        { input: ttl, left: textLeft, top: textTop },
        { input: tag, left: textLeft, top: textTop + ttlH + 7 * unit },
      ])
      .png()
      .toBuffer()
      .then((b) => sharp(b).resize({ height: 192 }).png({ compressionLevel: 9 }).toFile(out("public/brand/logo-horizontal.png")));

    // Íconos.
    writeFileSync(out("app/icon.png"), await square(symbol, 512, 0.92));
    writeFileSync(out("app/apple-icon.png"), await square(symbol, 180, 0.72, "#ffffff"));
    writeFileSync(out("public/icons/icon-192.png"), await square(symbol, 192, 0.9));
    writeFileSync(out("public/icons/icon-512.png"), await square(symbol, 512, 0.9));
    // Maskable: el símbolo dentro de la zona segura (círculo del 80 %).
    writeFileSync(out("public/icons/icon-maskable-512.png"), await square(symbol, 512, 0.58, "#ffffff"));
    const icoSizes = [16, 32, 48];
    const icoPngs = await Promise.all(
      icoSizes.map(async (size) => ({ size, data: await square(symbol, size, size <= 16 ? 1 : 0.94) })),
    );
    writeFileSync(out("app/favicon.ico"), buildIco(icoPngs));

    // Portada provisional de «Colegio de Valores Humanos» (slug beca-estudiantes; 16:10, sin texto).
    const W = 1600, Hc = 1000;
    const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hc}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${BRAND.cream}"/>
          <stop offset="1" stop-color="#f8e3dc"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${Hc}" fill="url(#g)"/>
      <circle cx="1360" cy="150" r="430" fill="${BRAND.pink}" fill-opacity="0.55"/>
      <circle cx="190" cy="930" r="380" fill="${BRAND.periwinkle}" fill-opacity="0.16"/>
      <circle cx="800" cy="520" r="360" fill="#ffffff" fill-opacity="0.55"/>
    </svg>`);
    const coverSymbol = await sharp(symbol).resize({ height: 520 }).png().toBuffer();
    await sharp(bg)
      .composite([{ input: coverSymbol, left: Math.round(W / 2 - (await sharp(coverSymbol).metadata()).width! / 2), top: 250 }])
      .webp({ quality: 88 })
      .toFile(out("supabase/seed-images/beca-estudiantes.webp"));

    console.log("Listo: logos, íconos y portada provisional generados.");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
