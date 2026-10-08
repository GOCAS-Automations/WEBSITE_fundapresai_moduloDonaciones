/**
 * Imágenes para redes sociales (Open Graph / WhatsApp), 1200×630 en JPEG.
 *
 * - Marca: archivo ESTÁTICO public/og/fundapresai.jpg (npm run brand:share):
 *   logo, lema y título del hero sobre la paleta con el motivo de hojas. URL
 *   absoluta y estable; es la de la landing si «Buscadores y redes» no tiene
 *   imagen propia, la de privacidad y el respaldo de las campañas.
 * - Campaña: su portada COMPLETA (sin recortar: muchas traen texto o el logo
 *   cerca del borde) sobre un fondo desenfocado de sí misma, con la insignia
 *   del logo de Fundapresai abajo a la izquierda. Las portadas se suben en
 *   WebP, que WhatsApp no siempre muestra; por eso se sirve en JPEG.
 *
 * Se generan con sharp (dependencia opcional de Next, la misma que optimiza
 * imágenes) dentro de funciones "use cache": se calculan una vez y se
 * invalidan con las mismas etiquetas que la campaña (lib/revalidate.ts).
 * Devuelven base64 para que la entrada de caché sea texto serializable.
 * Los archivos de public/ que se leen aquí se incluyen en la función con
 * outputFileTracingIncludes (next.config.ts).
 */
import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { cacheLife, cacheTag } from "next/cache";
import sharp from "sharp";

import { CACHE_TAGS, getCampaignBySlug } from "@/lib/content";
import { OG_SIZE } from "@/lib/seo";

const { width: W, height: H } = OG_SIZE;

/** Imagen de marca (JPEG en base64), leída de public/og/fundapresai.jpg. */
export async function getBrandOgImage(): Promise<string> {
  "use cache";
  cacheLife("max");
  const file = await readFile(path.join(process.cwd(), "public", "og", "fundapresai.jpg"));
  return file.toString("base64");
}

/** Insignia blanca con el logo horizontal (y su sombra), para la esquina de las portadas. */
async function logoBadge(): Promise<Buffer> {
  const logo = await sharp(await readFile(path.join(process.cwd(), "public", "brand", "logo-horizontal.png")))
    .resize({ height: 54 })
    .png()
    .toBuffer();
  const { width: lw = 256 } = await sharp(logo).metadata();
  const bw = lw + 44;
  const bh = 54 + 28;
  const card = `<svg xmlns="http://www.w3.org/2000/svg" width="${bw + 24}" height="${bh + 24}">
    <defs><filter id="s" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#2b2233" flood-opacity="0.22"/>
    </filter></defs>
    <rect x="12" y="8" width="${bw}" height="${bh}" rx="22" fill="#ffffff" filter="url(#s)"/>
  </svg>`;
  return sharp(Buffer.from(card))
    .composite([{ input: logo, left: 12 + 22, top: 8 + 14 }])
    .png()
    .toBuffer();
}

/**
 * Portada de una campaña activa en 1200×630 (JPEG en base64), o null si la
 * campaña no existe, no está activa o su portada no se pudo descargar.
 */
export async function getCampaignOgImage(slug: string): Promise<string | null> {
  "use cache";
  cacheTag(CACHE_TAGS.campaigns, CACHE_TAGS.campaign(slug));

  const campaign = await getCampaignBySlug(slug);
  const result = campaign?.cover_image_url ? await coverToJpeg(campaign.cover_image_url) : null;
  // Si falló la descarga (p. ej. Drive limitó las visitas), se reintenta pronto.
  if (result) cacheLife("max");
  else cacheLife("minutes");
  return result;
}

async function coverToJpeg(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const input = Buffer.from(await res.arrayBuffer());

    // Fondo: la misma portada a todo el ancho, desenfocada.
    const back = await sharp(input)
      .rotate()
      .resize(W, H, { fit: "cover", position: "centre" })
      .blur(28)
      .modulate({ brightness: 0.92, saturation: 0.9 })
      .png()
      .toBuffer();
    // Frente: la portada completa, sin recortar, centrada y con una sombra suave.
    const front = await sharp(input).rotate().resize(W, H, { fit: "inside" }).png().toBuffer();
    const { width: fw = W, height: fh = H } = await sharp(front).metadata();
    const left = Math.round((W - fw) / 2);
    const top = Math.round((H - fh) / 2);
    const shadow = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><filter id="b"><feGaussianBlur stdDeviation="14"/></filter></defs>
        <rect x="${left}" y="${top}" width="${fw}" height="${fh}" fill="#2b2233" opacity="0.28" filter="url(#b)"/></svg>`,
    );
    const badge = await logoBadge();
    const { height: bh = 106 } = await sharp(badge).metadata();

    const jpeg = await sharp(back)
      .composite([
        { input: shadow, left: 0, top: 0 },
        { input: front, left, top },
        { input: badge, left: 18, top: H - bh - 14 },
      ])
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return jpeg.toString("base64");
  } catch (err) {
    console.error(`[og] No se pudo preparar la portada (${url.slice(0, 80)}):`, err instanceof Error ? err.message : err);
    return null;
  }
}
