/**
 * Loader de next/image (next.config.ts → images.loaderFile): ninguna imagen
 * pasa por /_next/image, así no se gastan transformaciones de Vercel.
 *
 * - Imagen del bucket «media» → la variante pre-generada más pequeña que
 *   alcance el ancho pedido (lib/image-variants.ts).
 * - Externa, de /public o sin variantes → `src` tal cual (además, esas se
 *   marcan `unoptimized` y ni siquiera llegan aquí: lib/images.ts).
 */
import { variantSrc } from "./image-variants";

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  return variantSrc(src, width);
}
