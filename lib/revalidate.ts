/**
 * Patrón de revalidación del contenido público (para el panel, fase 4).
 *
 * Cómo funciona la caché (Cache Components de Next 16):
 * 1. Cada lectura pública vive en lib/content.ts como función "use cache" con
 *    `cacheTag(...)` y `cacheLife("max")`. La landing (`/`) solo usa esas
 *    funciones, así que `next build` la prerenderiza como página ESTÁTICA (○).
 * 2. Las etiquetas están en CACHE_TAGS:
 *      - "site-settings"   → getSiteSettings()   (hero, quiénes somos, contacto…)
 *      - "campaigns"       → getActiveCampaigns() y getCampaignBySlug()
 *      - "campaign:<slug>" → getCampaignBySlug(slug)
 * 3. Cuando Angela guarda algo en el panel, la Server Action llama a uno de los
 *    helpers de abajo DESPUÉS de escribir en Supabase. `updateTag` caduca la
 *    entrada al instante (la siguiente visita espera los datos nuevos: «leer lo
 *    que uno mismo escribió») y `revalidatePath` regenera las páginas.
 *
 * Uso en una Server Action (app/admin/.../actions.ts):
 *
 *   "use server";
 *   import { revalidateCampaign } from "@/lib/revalidate";
 *
 *   export async function saveCampaign(formData: FormData) {
 *     // 1) validar con campaignSchema, 2) escribir con el cliente de servidor
 *     revalidateCampaign(slug, previousSlug); // 3) invalidar
 *   }
 *
 * Importante: `updateTag` SOLO funciona dentro de Server Actions. Desde un
 * Route Handler use `revalidateTag(tag, "max")` (sirve lo viejo mientras
 * regenera en segundo plano).
 */
import "server-only";

import { revalidatePath, updateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/content";

/** Tras editar cualquier bloque de site_settings (hero, quiénes somos, contacto, redes…). */
export function revalidateSiteSettings() {
  updateTag(CACHE_TAGS.settings);
  // El pie y el contacto aparecen en todas las páginas públicas.
  revalidatePath("/", "layout");
}

/**
 * Tras crear, editar, publicar, ocultar, reordenar o destacar una campaña.
 * Si cambió el slug, pase también el anterior para que su página deje de existir.
 */
export function revalidateCampaign(slug?: string, previousSlug?: string) {
  updateTag(CACHE_TAGS.campaigns);
  for (const s of new Set([slug, previousSlug].filter(Boolean) as string[])) {
    updateTag(CACHE_TAGS.campaign(s));
    revalidatePath(`/campanas/${s}`);
  }
  revalidatePath("/");
}
