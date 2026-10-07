/**
 * Política de imágenes (plan §9): las del bucket «media» de Supabase pasan por
 * el optimizador de next/image (remotePatterns en next.config.ts). Las URL
 * externas que pegue el panel se muestran con `unoptimized`: así nadie puede
 * usar /_next/image como proxy abierto ni gastar la cuota de optimización de
 * Vercel Hobby con imágenes de terceros.
 */
export function isSupabaseStorageUrl(src: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  if (!base) return false;
  return src.startsWith(`${base}/storage/v1/object/public/`);
}

/** true si la imagen debe servirse sin optimizar (externa). Las rutas locales sí se optimizan. */
export function shouldSkipOptimization(src: string): boolean {
  if (src.startsWith("/")) return false;
  return !isSupabaseStorageUrl(src);
}
