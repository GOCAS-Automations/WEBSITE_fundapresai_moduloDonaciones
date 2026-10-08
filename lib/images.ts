/**
 * Política de imágenes: CERO transformaciones en Vercel (decisión de Cesar,
 * fase 6). Nada pasa por /_next/image:
 * - Las del bucket «media» de Supabase usan el loader propio
 *   (lib/image-loader.ts), que arma el `srcset` con sus variantes
 *   pre-generadas de 640, 1080 y 1600 px (lib/image-variants.ts).
 * - Las demás (URL externas pegadas en el panel, archivos de /public) se
 *   muestran con `unoptimized`: el navegador las pide tal cual.
 */
import { hasVariants } from "./image-variants";

/** true si la imagen se muestra tal cual (sin srcset): todo lo que no sea una original del bucket. */
export function shouldSkipOptimization(src: string): boolean {
  return !hasVariants(src);
}
