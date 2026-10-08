/**
 * Variantes de las imágenes del bucket «media» (fase 6): CERO transformaciones
 * de imágenes en Vercel.
 *
 * Cada imagen subida al bucket (`<carpeta>/<base>.<ext>`) tiene además tres
 * copias más pequeñas con el mismo formato y nombre fijo:
 *   <base>-w640.<ext> · <base>-w1080.<ext> · <base>-w1600.<ext>
 * (nunca más anchas que la original). Las crea el panel al subir
 * (lib/admin/image-processing.ts) y, para las que ya estaban, el script
 * `npm run images:variants` (con sharp).
 *
 * next/image usa un loader propio (lib/image-loader.ts): para una imagen del
 * bucket elige la variante más pequeña que alcance el ancho pedido, así que
 * el `srcset` apunta directo a Supabase Storage y ninguna imagen pasa por
 * /_next/image. Sirve en el servidor, en el navegador y en los scripts.
 */

export const IMAGE_VARIANT_WIDTHS = [640, 1080, 1600] as const;

const BUCKET = "media";

/** «<carpeta>/<archivo>.<ext>» (una carpeta, sin subcarpetas). */
const ORIGINAL_PATH = /^[a-z0-9_-]+\/[^/]+\.(webp|jpe?g|png|avif)$/i;
/** Variante: termina en -w<ancho>.<ext>. */
const VARIANT_SUFFIX = /-w\d+\.(webp|jpe?g|png|avif)$/i;

function publicPrefix(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  return base ? `${base}/storage/v1/object/public/${BUCKET}/` : null;
}

/** Ruta dentro del bucket («campanas/x.webp») si la URL es del bucket «media»; si no, null. */
export function mediaPath(url: string): string | null {
  const prefix = publicPrefix();
  if (!prefix || !url.startsWith(prefix)) return null;
  try {
    const path = decodeURIComponent(url.slice(prefix.length).split(/[?#]/)[0]);
    return path && !path.split("/").includes("..") ? path : null;
  } catch {
    return null;
  }
}

export function isVariantPath(path: string): boolean {
  return VARIANT_SUFFIX.test(path);
}

/** ¿Es una imagen original del bucket (con sus variantes)? */
export function isOriginalPath(path: string): boolean {
  return ORIGINAL_PATH.test(path) && !isVariantPath(path);
}

/** «campanas/x-123.webp» + 640 → «campanas/x-123-w640.webp». */
export function variantPath(path: string, width: number): string {
  return path.replace(/\.([a-z0-9]+)$/i, `-w${width}.$1`);
}

/** Las tres variantes de una imagen original (para subirlas o borrarlas). */
export function variantPaths(path: string): string[] {
  return IMAGE_VARIANT_WIDTHS.map((w) => variantPath(path, w));
}

/** true si la URL es una imagen original del bucket: next/image la sirve con sus variantes. */
export function hasVariants(src: string): boolean {
  const path = mediaPath(src);
  return path !== null && isOriginalPath(path);
}

/**
 * La variante más pequeña cuyo ancho alcanza `width`; la original si se pide
 * más que la variante mayor. Cualquier otra imagen (externa, de /public o sin
 * variantes) se devuelve tal cual.
 */
export function variantSrc(src: string, width: number): string {
  if (!hasVariants(src)) return src;
  const w = IMAGE_VARIANT_WIDTHS.find((v) => v >= width);
  if (!w) return src;
  const cut = src.search(/[?#]/);
  const [clean, rest] = cut === -1 ? [src, ""] : [src.slice(0, cut), src.slice(cut)];
  return `${variantPath(clean, w)}${rest}`;
}
