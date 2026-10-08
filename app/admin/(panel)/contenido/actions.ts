"use server";

/**
 * Guardar un bloque de site_settings (cada bloque tiene su botón Guardar).
 * Verifica is_admin() en el servidor, valida con Zod y revalida el sitio.
 */
import { refresh } from "next/cache";

import { ACCESS_MESSAGES, fail, ok, VALIDATION_MESSAGE, type ActionState } from "@/lib/admin/action-state";
import { humanizeError } from "@/lib/admin/errors";
import { dropEmptyRows, formDataToObject } from "@/lib/admin/form-data";
import { revalidateSiteSettings } from "@/lib/revalidate";
import type { Json, TablesUpdate } from "@/lib/supabase/database.types";
import { requireAdmin } from "@/lib/supabase/server";
import { fieldErrors, privacySchema, siteSettingsBlockSchemas, type SiteSettingsBlock } from "@/lib/validations";

export type SiteBlockKey = SiteSettingsBlock | "privacy";

const BLOCK_LABELS: Record<SiteBlockKey, string> = {
  hero: "Portada",
  about: "Quiénes somos",
  how_to_donate: "Cómo donar",
  help: "Ayuda para donar",
  contact: "Contacto",
  socials: "Redes sociales",
  seo: "Buscadores y redes",
  privacy: "Política de privacidad",
};

function isBlockKey(value: unknown): value is SiteBlockKey {
  return typeof value === "string" && value in BLOCK_LABELS;
}

export async function saveSiteBlock(block: SiteBlockKey, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isBlockKey(block)) return fail("Ese bloque no existe.");

  const auth = await requireAdmin();
  if (!auth.ok) return fail(ACCESS_MESSAGES[auth.reason]);

  const raw = formDataToObject(formData);
  let update: TablesUpdate<"site_settings">;

  if (block === "privacy") {
    const parsed = privacySchema.safeParse(raw);
    if (!parsed.success) return fail(VALIDATION_MESSAGE, fieldErrors(parsed.error));
    update = { privacy_md: parsed.data.privacy_md };
  } else {
    if (block === "about") raw.stats = dropEmptyRows(raw.stats);
    const parsed = siteSettingsBlockSchemas[block].safeParse(raw);
    if (!parsed.success) return fail(VALIDATION_MESSAGE, fieldErrors(parsed.error));
    update = { [block]: parsed.data as Json };
  }

  const { data, error } = await auth.supabase.from("site_settings").update(update).eq("id", 1).select("id");
  if (error) return fail(humanizeError(error, `guardar ${block}`));
  // RLS no da error si no deja escribir: simplemente no actualiza ninguna fila.
  if (!data?.length) return fail(ACCESS_MESSAGES["no-admin"]);

  revalidateSiteSettings();
  refresh();
  return ok(`Se guardó «${BLOCK_LABELS[block]}». Los cambios ya están publicados en el sitio.`);
}
