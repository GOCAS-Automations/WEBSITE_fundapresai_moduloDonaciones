/**
 * Lectura centralizada de variables de entorno públicas.
 * Las variables NEXT_PUBLIC_* se incrustan al compilar: deben leerse con su
 * nombre literal (process.env.NEXT_PUBLIC_X), no con acceso dinámico.
 */

export type SupabasePublicEnv = { url: string; anonKey: string };

/**
 * URL y clave pública de Supabase, o null si faltan (p. ej. en un build sin
 * configurar). La clave puede ser la «anon» legacy (JWT) o la nueva
 * «publishable» (sb_publishable_...): supabase-js acepta ambas.
 */
export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/+$/, ""), anonKey };
}

export function requireSupabasePublicEnv(): SupabasePublicEnv {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Revise .env.local o las variables de Vercel.",
    );
  }
  return env;
}

/** Dominio canónico del sitio (sin barra final). */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/** Solo se indexa cuando NEXT_PUBLIC_ALLOW_INDEXING === "true" (subdominio definitivo). */
export function isIndexingAllowed(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_INDEXING?.trim().toLowerCase() === "true";
}
