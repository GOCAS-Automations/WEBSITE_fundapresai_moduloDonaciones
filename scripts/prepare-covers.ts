/**
 * Prepara las portadas 16:10 de las tarjetas a partir de las imágenes originales
 * de Donar Online (supabase/seed-images/originales/).
 *
 * Uso:  npm run covers:prepare
 *
 * Ninguna portada original viene en 16:10 y todas traen texto dentro de la
 * imagen, así que cada una tiene un recorte pensado a mano (ver CROPS).
 * Son PROVISIONALES: lo ideal es reemplazarlas por fotos reales desde el panel.
 *
 * Para volver a bajar un original: las URL de S3 de Donar Online van firmadas y
 * caducan en 1 hora, pero la página pública de cada campaña genera una URL
 * vigente en cada visita (buscar «doprod-statics…/pictures/cover/» en el HTML).
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIR = path.resolve(__dirname, "..", "supabase", "seed-images");
const RATIO = 16 / 10;

type Crop = {
  /** Región del original que se conserva. */
  region: { left: number; top: number; width: number; height: number };
  /** Si la región no es 16:10, se completa a los lados con este color (fondo del original). */
  padColor?: string;
};

const CROPS: Record<string, Crop> = {
  // 1674×559 (≈3:1). Pancarta con texto a la izquierda; se usa solo la foto de las manos.
  "unidos-por-su-educacion": { region: { left: 1120, top: 106, width: 554, height: 346 } },
  // 1019×430 (≈2.37:1). Se conservan las dos tarjetas de bono y se completa con el fondo.
  "bonos-con-sentido": {
    region: { left: 522, top: 0, width: 497, height: 430 },
    padColor: "#fefaf7",
  },
  // 1240×1748 (vertical, A4). Se usa la franja inferior: flores y logo, sin el texto.
  "bonos-ser-amor-en-accion": { region: { left: 0, top: 973, width: 1240, height: 775 } },
};

async function main() {
  const originals = readdirSync(path.join(DIR, "originales"));
  for (const [slug, crop] of Object.entries(CROPS)) {
    const file = originals.find((f) => f.startsWith(`${slug}.`));
    if (!file) throw new Error(`Falta el original de ${slug}`);
    let img = sharp(path.join(DIR, "originales", file)).extract(crop.region);
    const { width, height } = crop.region;
    if (crop.padColor && Math.abs(width / height - RATIO) > 0.01) {
      const targetW = Math.round(height * RATIO);
      const pad = Math.max(0, targetW - width);
      img = sharp(await img.png().toBuffer()).extend({
        left: Math.floor(pad / 2),
        right: Math.ceil(pad / 2),
        background: crop.padColor,
      });
    }
    const out = path.join(DIR, `${slug}.webp`);
    const info = await img.webp({ quality: 86 }).toFile(out);
    const ratio = (info.width / info.height).toFixed(3);
    console.log(`${slug}.webp  ${info.width}×${info.height}  (${ratio})  ${(info.size / 1024).toFixed(0)} KB`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
