"use server";

/**
 * Server Actions de campañas. Cada una verifica is_admin() en el servidor
 * (requireAdmin), valida con Zod, escribe con la sesión del usuario (RLS) y
 * revalida el sitio público con revalidateCampaign().
 */
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ACCESS_MESSAGES, fail, ok, VALIDATION_MESSAGE, type ActionState } from "@/lib/admin/action-state";
import { humanizeError } from "@/lib/admin/errors";
import { formDataToObject } from "@/lib/admin/form-data";
import { revalidateCampaign } from "@/lib/revalidate";
import { requireAdmin } from "@/lib/supabase/server";
import { CAMPAIGN_STATUS_LABELS, campaignSchema, fieldErrors } from "@/lib/validations";

/** El orden lo maneja el listado (↑ ↓), no el formulario. */
const campaignFormSchema = campaignSchema.omit({ sort_order: true });
const idSchema = z.uuid();

const SLUG_TAKEN = "Ya hay otra campaña con esta dirección. Cambie la dirección de la página (por ejemplo, agregue el año).";

export async function saveCampaign(campaignId: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireAdmin();
  if (!auth.ok) return fail(ACCESS_MESSAGES[auth.reason]);
  if (campaignId !== null && !idSchema.safeParse(campaignId).success) return fail("Esa campaña no existe.");

  const parsed = campaignFormSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return fail(VALIDATION_MESSAGE, fieldErrors(parsed.error));
  const { is_featured, ...fields } = parsed.data;
  const { supabase } = auth;

  let id = campaignId;
  let previous: { slug: string; is_featured: boolean } | null = null;

  if (id) {
    const { data, error } = await supabase.from("campaigns").select("slug, is_featured").eq("id", id).maybeSingle();
    if (error) return fail(humanizeError(error, "leer campaña"));
    if (!data) return fail("No encontramos esta campaña: puede que la hayan eliminado.");
    previous = data;

    const { data: updated, error: updateError } = await supabase.from("campaigns").update(fields).eq("id", id).select("id");
    if (updateError) {
      if (updateError.code === "23505") return fail(VALIDATION_MESSAGE, { slug: SLUG_TAKEN });
      return fail(humanizeError(updateError, "editar campaña"));
    }
    if (!updated?.length) return fail(ACCESS_MESSAGES["no-admin"]);
  } else {
    // Las nuevas van al final de la lista.
    const { data: last } = await supabase
      .from("campaigns")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: created, error: insertError } = await supabase
      .from("campaigns")
      .insert({ ...fields, sort_order: (last?.sort_order ?? 0) + 1, is_featured: false })
      .select("id")
      .single();
    if (insertError) {
      if (insertError.code === "23505") return fail(VALIDATION_MESSAGE, { slug: SLUG_TAKEN });
      return fail(humanizeError(insertError, "crear campaña"));
    }
    id = created.id;
  }

  // Destacada: una sola. set_featured_campaign() desmarca las demás en una transacción.
  if (is_featured && !previous?.is_featured) {
    const { error } = await supabase.rpc("set_featured_campaign", { p_campaign_id: id });
    if (error) return fail(`La campaña se guardó, pero no se pudo marcar como destacada. ${humanizeError(error, "destacar")}`);
  } else if (!is_featured && previous?.is_featured) {
    const { error } = await supabase.from("campaigns").update({ is_featured: false }).eq("id", id);
    if (error) return fail(`La campaña se guardó, pero no se pudo quitar como destacada. ${humanizeError(error, "quitar destacada")}`);
  }

  revalidateCampaign(fields.slug, previous?.slug);

  if (!campaignId) redirect(`/admin/campanas?creada=${encodeURIComponent(fields.slug)}`);

  refresh();
  return ok(
    fields.status === "active"
      ? "Cambios guardados. Ya se ven en el sitio."
      : `Cambios guardados. La campaña está como «${CAMPAIGN_STATUS_LABELS[fields.status]}», así que no se ve en el sitio.`,
  );
}

type Row = { id: string; slug: string; title: string; sort_order: number };

export async function moveCampaign(id: string, direction: "up" | "down"): Promise<ActionState> {
  const auth = await requireAdmin();
  if (!auth.ok) return fail(ACCESS_MESSAGES[auth.reason]);
  if (!idSchema.safeParse(id).success || (direction !== "up" && direction !== "down")) return fail("Movimiento no válido.");
  const { supabase } = auth;

  const { data: rows, error } = await supabase
    .from("campaigns")
    .select("id, slug, title, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return fail(humanizeError(error, "leer orden"));

  const index = rows.findIndex((r) => r.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1) return fail("No encontramos esta campaña: puede que la hayan eliminado.");
  if (target < 0 || target >= rows.length) return ok("La campaña ya está en ese extremo de la lista.");

  const a = rows[index];
  const b = rows[target];
  let updates: Pick<Row, "id" | "sort_order">[];
  if (a.sort_order !== b.sort_order) {
    // Intercambio simple: deshacer (↓ y luego ↑) deja los mismos números.
    updates = [
      { id: a.id, sort_order: b.sort_order },
      { id: b.id, sort_order: a.sort_order },
    ];
  } else {
    // Empate de números: se renumera toda la lista 1, 2, 3…
    const reordered = [...rows];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    updates = reordered.map((r, i) => ({ id: r.id, sort_order: i + 1 })).filter((u, i) => u.sort_order !== reordered[i].sort_order);
  }

  for (const u of updates) {
    const { data, error: updateError } = await supabase.from("campaigns").update({ sort_order: u.sort_order }).eq("id", u.id).select("id");
    if (updateError) return fail(humanizeError(updateError, "reordenar"));
    if (!data?.length) return fail(ACCESS_MESSAGES["no-admin"]);
  }

  revalidateCampaign();
  refresh();
  return ok(`«${a.title}» quedó en la posición ${target + 1} de ${rows.length}.`);
}

export async function setCampaignVisibility(id: string, visible: boolean): Promise<ActionState> {
  const auth = await requireAdmin();
  if (!auth.ok) return fail(ACCESS_MESSAGES[auth.reason]);
  if (!idSchema.safeParse(id).success) return fail("Esa campaña no existe.");
  const { supabase } = auth;

  const { data: row, error } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle();
  if (error) return fail(humanizeError(error, "leer campaña"));
  if (!row) return fail("No encontramos esta campaña: puede que la hayan eliminado.");

  if (visible) {
    // Antes de publicarla, la campaña debe estar completa (portada, enlace, textos…).
    const check = campaignSchema.safeParse({ ...row, status: "active" });
    if (!check.success) {
      return fail(`Antes de mostrarla, complete la campaña con «Editar»: ${check.error.issues[0]?.message ?? "faltan datos."}`);
    }
  }

  const status = visible ? "active" : "hidden";
  const { data, error: updateError } = await supabase.from("campaigns").update({ status }).eq("id", id).select("id");
  if (updateError) return fail(humanizeError(updateError, "ocultar/mostrar"));
  if (!data?.length) return fail(ACCESS_MESSAGES["no-admin"]);

  revalidateCampaign(row.slug);
  refresh();
  return ok(visible ? `«${row.title}» ya se ve en el sitio.` : `«${row.title}» quedó oculta: ya no se ve en el sitio.`);
}

export async function deleteCampaign(id: string): Promise<ActionState> {
  const auth = await requireAdmin();
  if (!auth.ok) return fail(ACCESS_MESSAGES[auth.reason]);
  if (!idSchema.safeParse(id).success) return fail("Esa campaña no existe.");
  const { supabase } = auth;

  const { data, error } = await supabase.from("campaigns").delete().eq("id", id).select("slug, title");
  if (error) return fail(humanizeError(error, "eliminar"));
  if (!data?.length) return fail("No se pudo eliminar: la campaña ya no existe o su cuenta no tiene permiso.");

  revalidateCampaign(data[0].slug);
  refresh();
  return ok(`Se eliminó la campaña «${data[0].title}».`);
}
