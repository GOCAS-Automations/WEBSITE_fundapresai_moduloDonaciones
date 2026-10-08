/**
 * Limpieza de imágenes huérfanas del bucket «media» (plan §9 y §10: 1 GB del
 * plan gratuito).
 *
 * Cuando el panel reemplaza o quita una imagen, o elimina una campaña, la
 * imagen anterior se borra del bucket SOLO si:
 *   1. es de nuestro bucket (las URL externas, como Drive, no se tocan), y
 *   2. ya no la usa ninguna campaña (activa, borrador u oculta) ni ningún
 *      bloque del sitio (portada, «Quiénes somos», imagen para redes).
 *
 * Se hace con el cliente del administrador (RLS permite a los admins borrar en
 * Storage). Nunca lanza: si algo falla, se registra y el guardado sigue bien.
 * Ante la duda (no se pudo leer qué está en uso), no se borra nada.
 */
import "server-only";

import type { createSupabaseServerClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const BUCKET = "media";

/** Ruta dentro del bucket («campanas/x.webp») si la URL es de nuestro bucket; si no, null. */
export function mediaPathFromUrl(url: unknown): string | null {
  if (typeof url !== "string" || !url) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  if (!base) return null;
  const prefix = `${base}/storage/v1/object/public/${BUCKET}/`;
  if (!url.startsWith(prefix)) return null;
  let path: string;
  try {
    path = decodeURIComponent(url.slice(prefix.length).split(/[?#]/)[0]);
  } catch {
    return null;
  }
  return path && !path.split("/").includes("..") ? path : null;
}

/** URL de imagen de un bloque jsonb de site_settings (image_url u og_image_url). */
export function blockImage(block: unknown, key: "image_url" | "og_image_url"): unknown {
  return block && typeof block === "object" && !Array.isArray(block) ? (block as Record<string, unknown>)[key] : null;
}

/** Rutas del bucket que siguen en uso, o null si no se pudo saber. */
async function pathsInUse(supabase: ServerClient): Promise<Set<string> | null> {
  const [campaigns, settings] = await Promise.all([
    supabase.from("campaigns").select("cover_image_url"),
    supabase.from("site_settings").select("hero, about, seo").eq("id", 1).maybeSingle(),
  ]);
  if (campaigns.error || settings.error) {
    console.error("[media] No se pudo comprobar qué imágenes están en uso:", campaigns.error?.message ?? settings.error?.message);
    return null;
  }
  const urls: unknown[] = campaigns.data.map((c) => c.cover_image_url);
  if (settings.data) {
    urls.push(
      blockImage(settings.data.hero, "image_url"),
      blockImage(settings.data.about, "image_url"),
      blockImage(settings.data.seo, "og_image_url"),
    );
  }
  return new Set(urls.map(mediaPathFromUrl).filter((p): p is string => p !== null));
}

/**
 * Borra del bucket las imágenes `previousUrls` que ya nadie usa. Llamar
 * DESPUÉS de guardar el cambio en la base. Devuelve las rutas borradas.
 */
export async function removeOrphanedImages(supabase: ServerClient, previousUrls: unknown[]): Promise<string[]> {
  try {
    const candidates = [...new Set(previousUrls.map(mediaPathFromUrl).filter((p): p is string => p !== null))];
    if (candidates.length === 0) return [];
    const inUse = await pathsInUse(supabase);
    if (!inUse) return [];
    const orphaned = candidates.filter((p) => !inUse.has(p));
    if (orphaned.length === 0) return [];
    const { data, error } = await supabase.storage.from(BUCKET).remove(orphaned);
    if (error) {
      console.error("[media] No se pudieron borrar imágenes huérfanas:", error.message, orphaned);
      return [];
    }
    return (data ?? []).map((f) => f.name);
  } catch (err) {
    console.error("[media] Error al limpiar imágenes huérfanas:", err);
    return [];
  }
}
