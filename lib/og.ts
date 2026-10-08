/**
 * Imágenes para redes sociales (Open Graph / WhatsApp), 1200×630 en JPEG.
 *
 * - Marca: degradado de la paleta, el símbolo en tono suave y el logo vertical
 *   con el lema. Se usa en la landing si «Buscadores y redes» no tiene imagen
 *   propia, en privacidad y como respaldo.
 * - Campaña: su portada recortada a 1200×630. Las portadas se suben en WebP,
 *   que WhatsApp no siempre muestra en la vista previa; por eso se sirve una
 *   copia en JPEG.
 *
 * Se generan con sharp (dependencia opcional de Next, la misma que optimiza
 * imágenes) dentro de funciones "use cache": se calculan una vez y se
 * invalidan con las mismas etiquetas que la campaña (lib/revalidate.ts).
 * Devuelven base64 para que la entrada de caché sea texto serializable.
 */
import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { cacheLife, cacheTag } from "next/cache";
import sharp from "sharp";

import { LEAF_PATHS } from "@/components/brand/LeafSymbol";
import { CACHE_TAGS, getCampaignBySlug } from "@/lib/content";
import { OG_SIZE } from "@/lib/seo";

const { width: W, height: H } = OG_SIZE;

function leaves(transform: string, colors: { purple: string; periwinkle: string; terracotta: string }, opacity = 1) {
  return `<g transform="${transform}" opacity="${opacity}">
    <path fill="${colors.purple}" d="${LEAF_PATHS.purple}"/>
    <path fill="${colors.periwinkle}" d="${LEAF_PATHS.periwinkle}"/>
    <path fill="${colors.terracotta}" d="${LEAF_PATHS.terracotta}"/>
  </g>`;
}

const SOFT = { purple: "#e9dff2", periwinkle: "#dfe5f4", terracotta: "#f8dccb" };

const BRAND_BACKGROUND = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fffaf3"/>
      <stop offset="0.55" stop-color="#fdf4f2"/>
      <stop offset="1" stop-color="#fcf1dd"/>
    </linearGradient>
    <radialGradient id="pink" cx="0.95" cy="0.02" r="0.75">
      <stop offset="0" stop-color="#fbeef0"/>
      <stop offset="1" stop-color="#fbeef0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blue" cx="0.04" cy="1" r="0.7">
      <stop offset="0" stop-color="#eef1f9"/>
      <stop offset="1" stop-color="#eef1f9" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="22"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#pink)"/>
  <rect width="${W}" height="${H}" fill="url(#blue)"/>
  ${leaves("translate(860 330) scale(1.55)", SOFT)}
  ${leaves("translate(-150 -40) scale(1.25) rotate(-8)", SOFT, 0.75)}
  <rect x="408" y="104" width="384" height="430" rx="44" fill="#5f2c85" opacity="0.14" filter="url(#shadow)"/>
  <rect x="400" y="85" width="400" height="460" rx="44" fill="#ffffff"/>
</svg>`;

/** Imagen de marca (JPEG en base64). Se genera una sola vez. */
export async function getBrandOgImage(): Promise<string> {
  "use cache";
  cacheLife("max");
  const logo = await readFile(path.join(process.cwd(), "public", "brand", "logo-vertical.png"));
  const logoSized = await sharp(logo).resize({ height: 380 }).png().toBuffer();
  const { width: logoW = 368 } = await sharp(logoSized).metadata();
  const jpeg = await sharp(Buffer.from(BRAND_BACKGROUND))
    .composite([{ input: logoSized, left: Math.round((W - logoW) / 2), top: 125 }])
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  return jpeg.toString("base64");
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
    const jpeg = await sharp(input)
      .rotate()
      .resize(W, H, { fit: "cover", position: "centre" })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return jpeg.toString("base64");
  } catch (err) {
    console.error(`[og] No se pudo preparar la portada (${url.slice(0, 80)}):`, err instanceof Error ? err.message : err);
    return null;
  }
}
