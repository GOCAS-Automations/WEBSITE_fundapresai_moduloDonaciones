/**
 * Crea las variantes de 640, 1080 y 1600 px de las imágenes que ya están en
 * el bucket «media» (portadas, «Quiénes somos», hero…) y las sube con el
 * nombre fijo <base>-w640.<ext>, <base>-w1080.<ext>, <base>-w1600.<ext>
 * (lib/image-variants.ts). Las que suba el panel desde ahora ya las traen.
 *
 * Uso:  npm run images:variants            crea solo las que falten (idempotente)
 *       npm run images:variants -- --check  solo revisa: lista las que falten y sale con error si hay
 *
 * Mismo formato que la original (WebP calidad 82, JPEG 85, PNG o AVIF), sin
 * agrandar: si la original mide menos, la variante queda de su mismo ancho
 * (así el sitio siempre encuentra el archivo). Con la clave secreta (.env.local).
 */
import sharp from "sharp";

import { IMAGE_VARIANT_WIDTHS, isOriginalPath, variantPath } from "../lib/image-variants";
import { serviceClient } from "./lib/accounts";
import { loadLocalEnv } from "./lib/env";

loadLocalEnv();

const BUCKET = "media";
const CHECK = process.argv.includes("--check");
const service = serviceClient();

type Encoded = { buffer: Buffer; contentType: string };

async function encode(input: Buffer, width: number, format: string): Promise<Encoded> {
  const resized = sharp(input).rotate().resize({ width, withoutEnlargement: true });
  switch (format) {
    case "jpeg":
      return { buffer: await resized.jpeg({ quality: 85, mozjpeg: true }).toBuffer(), contentType: "image/jpeg" };
    case "png":
      return { buffer: await resized.png({ compressionLevel: 9 }).toBuffer(), contentType: "image/png" };
    case "avif":
    case "heif":
      return { buffer: await resized.avif({ quality: 60 }).toBuffer(), contentType: "image/avif" };
    default:
      return { buffer: await resized.webp({ quality: 82 }).toBuffer(), contentType: "image/webp" };
  }
}

async function listFolder(folder: string): Promise<string[]> {
  const names: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await service.storage.from(BUCKET).list(folder, { limit: 1000, offset });
    if (error) throw error;
    names.push(...data.filter((f) => f.id).map((f) => f.name));
    if (data.length < 1000) return names;
  }
}

async function main() {
  const { data: root, error } = await service.storage.from(BUCKET).list("", { limit: 1000 });
  if (error) throw error;
  const folders = root.filter((f) => !f.id).map((f) => f.name);

  let originals = 0;
  let created = 0;
  const missing: string[] = [];
  for (const folder of folders) {
    const names = new Set(await listFolder(folder));
    for (const name of names) {
      const path = `${folder}/${name}`;
      if (!isOriginalPath(path)) continue;
      originals++;
      const absent = IMAGE_VARIANT_WIDTHS.filter((w) => !names.has(variantPath(path, w).slice(folder.length + 1)));
      if (absent.length === 0) continue;
      if (CHECK) {
        missing.push(`${path} (faltan ${absent.join(", ")})`);
        continue;
      }
      const download = await service.storage.from(BUCKET).download(path);
      if (download.error) throw download.error;
      const input = Buffer.from(await download.data.arrayBuffer());
      const meta = await sharp(input).metadata();
      for (const width of absent) {
        const { buffer, contentType } = await encode(input, width, meta.format ?? "webp");
        const target = variantPath(path, width);
        const up = await service.storage.from(BUCKET).upload(target, buffer, { contentType, cacheControl: "31536000", upsert: false });
        if (up.error) throw new Error(`${target}: ${up.error.message}`);
        const out = await sharp(buffer).metadata();
        console.log(`+ ${target} (${out.width}×${out.height}, ${(buffer.length / 1024).toFixed(0)} KB; original ${meta.width}×${meta.height})`);
        created++;
      }
    }
  }

  if (CHECK) {
    console.log(missing.length ? `Faltan variantes:\n  ${missing.join("\n  ")}` : `Todas las imágenes (${originals}) tienen sus variantes.`);
    if (missing.length) process.exitCode = 1;
    return;
  }
  console.log(`Imágenes originales: ${originals} en ${folders.join(", ")}. Variantes creadas: ${created}.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
