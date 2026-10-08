/**
 * Prueba de seguridad con un usuario ANÓNIMO (plan §14 fase 1 y checklist §15):
 * - lee solo campañas activas (oculta una temporalmente con la clave secreta y la restaura);
 * - no puede insertar, actualizar ni borrar en ninguna tabla;
 * - no puede subir, listar ni borrar en Storage;
 * - no puede ejecutar las funciones internas (record_heartbeat, last_heartbeat, ...);
 * - no ve heartbeat ni admins.
 * Además: record_heartbeat con la clave secreta deja una fila nueva.
 *
 * Uso:  npm run test:rls   (no deja cambios salvo un latido de origen «manual»)
 */
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../lib/supabase/database.types";
import { loadLocalEnv, requireEnv } from "./lib/env";

type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];

function check(name: string, ok: boolean, detail = "") {
  results.push({ name, ok, detail });
}

/** Una operación anónima debe fallar con error (o, en Storage, no tener efecto). */
function denied(error: { message: string; code?: string } | null, data?: unknown): [boolean, string] {
  if (error) return [true, error.code ? `${error.code}: ${error.message}` : error.message];
  const empty = data == null || (Array.isArray(data) && data.length === 0);
  return [empty, empty ? "sin efecto (0 filas)" : `¡devolvió datos! ${JSON.stringify(data).slice(0, 120)}`];
}

const HIDE_SLUG = "bonos-ser-amor-en-accion";

async function main() {
  loadLocalEnv();
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  const anon = createClient<Database>(url, requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), opts);
  const admin = createClient<Database>(url, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), opts);

  // --- Estado de referencia (clave secreta) ---------------------------------
  const { data: all, error: allErr } = await admin.from("campaigns").select("id, slug, status, title");
  if (allErr || !all) throw new Error(`No se pudo leer con la clave secreta: ${allErr?.message}`);
  const activeCount = all.filter((c) => c.status === "active").length;
  const target = all.find((c) => c.slug === HIDE_SLUG);
  if (!target) throw new Error(`No existe la campaña ${HIDE_SLUG}`);

  // --- 1. Lectura pública ---------------------------------------------------
  {
    const { data, error } = await anon.from("campaigns").select("slug, status");
    check(
      "anon lee las campañas activas",
      !error && data?.length === activeCount && data.every((c) => c.status === "active"),
      error ? error.message : `${data?.length} de ${all.length} (activas: ${activeCount})`,
    );
  }
  {
    const { data, error } = await anon.from("site_settings").select("id");
    check("anon lee site_settings", !error && data?.length === 1, error?.message ?? `${data?.length} fila`);
  }

  // --- 2. Ocultar una campaña y verificar que desaparece --------------------
  const originalStatus = target.status;
  try {
    const { error: hideErr } = await admin.from("campaigns").update({ status: "hidden" }).eq("id", target.id);
    if (hideErr) throw new Error(`No se pudo ocultar: ${hideErr.message}`);
    const { data: list } = await anon.from("campaigns").select("slug");
    const { data: one } = await anon.from("campaigns").select("slug").eq("slug", HIDE_SLUG).maybeSingle();
    check(
      "campaña oculta no aparece para anon",
      Boolean(list && !list.some((c) => c.slug === HIDE_SLUG) && one === null),
      `listado: ${list?.length} campañas; por slug: ${one === null ? "no encontrada" : "¡visible!"}`,
    );
    const { data: draftList } = await anon.from("campaigns").select("slug").neq("status", "active");
    check("anon no ve borradores ni ocultas", (draftList?.length ?? 0) === 0, `${draftList?.length ?? 0} filas`);
  } finally {
    await admin.from("campaigns").update({ status: originalStatus }).eq("id", target.id);
    const { data: restored } = await admin.from("campaigns").select("status").eq("id", target.id).single();
    check("estado restaurado", restored?.status === originalStatus, `${HIDE_SLUG} → ${restored?.status}`);
  }

  // --- 3. Escrituras anónimas en tablas -------------------------------------
  {
    const r = await anon.from("campaigns").insert({
      slug: "prueba-rls",
      title: "Prueba",
      summary: "Prueba",
      donation_url: "https://donaronline.org/prueba",
    }).select();
    check("anon NO inserta en campaigns", ...denied(r.error, r.data));
  }
  {
    const r = await anon.from("campaigns").update({ title: "Hackeado" }).eq("id", target.id).select();
    check("anon NO actualiza campaigns", ...denied(r.error, r.data));
  }
  {
    const r = await anon.from("campaigns").delete().eq("id", target.id).select();
    check("anon NO borra campaigns", ...denied(r.error, r.data));
  }
  {
    const r = await anon.from("site_settings").update({ privacy_md: "x" }).eq("id", 1).select();
    check("anon NO actualiza site_settings", ...denied(r.error, r.data));
  }
  {
    const r = await anon.from("site_settings").insert({ id: 1 }).select();
    check("anon NO inserta en site_settings", ...denied(r.error, r.data));
  }
  {
    const r = await anon.from("site_settings").delete().eq("id", 1).select();
    check("anon NO borra site_settings", ...denied(r.error, r.data));
  }
  {
    const r = await anon.from("admins").select("*");
    check("anon NO ve admins", ...denied(r.error, r.data));
  }
  {
    const r = await anon.from("admins").insert({ user_id: "00000000-0000-0000-0000-000000000000", name: "x", username: "intruso" }).select();
    check("anon NO inserta en admins", ...denied(r.error, r.data));
  }
  {
    const r = await anon.from("heartbeat").select("*");
    check("anon NO ve heartbeat", ...denied(r.error, r.data));
  }
  {
    const r = await anon.from("heartbeat").insert({ source: "manual" }).select();
    check("anon NO inserta en heartbeat", ...denied(r.error, r.data));
  }
  {
    const { data: after } = await admin.from("campaigns").select("title").eq("id", target.id).single();
    check("los datos siguen intactos", after?.title === target.title, after?.title ?? "(sin fila)");
  }

  // --- 4. Funciones ---------------------------------------------------------
  {
    const r = await anon.rpc("record_heartbeat", { source: "manual" });
    check("anon NO ejecuta record_heartbeat", ...denied(r.error, r.data));
  }
  {
    const r = await anon.rpc("last_heartbeat");
    check("anon NO ejecuta last_heartbeat", ...denied(r.error, r.data));
  }
  {
    const r = await anon.rpc("set_featured_campaign", { p_campaign_id: target.id });
    check("anon NO ejecuta set_featured_campaign", ...denied(r.error, r.data));
  }

  // --- 5. Storage -------------------------------------------------------------
  const { data: objects } = await admin.storage.from("media").list("campaigns");
  const existing = objects?.find((o) => o.name.endsWith(".webp"));
  {
    const png1x1 = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const r = await anon.storage.from("media").upload("pruebas/anon.png", png1x1, { contentType: "image/png" });
    check("anon NO sube a Storage", ...denied(r.error, r.data));
  }
  {
    const r = await anon.storage.from("media").list("campaigns");
    check("anon NO lista el bucket", ...denied(r.error, r.data));
  }
  if (existing) {
    const path = `campaigns/${existing.name}`;
    const r = await anon.storage.from("media").remove([path]);
    const { data: still } = await admin.storage.from("media").list("campaigns", { search: existing.name });
    const survived = Boolean(still?.some((o) => o.name === existing.name));
    check("anon NO borra en Storage", survived, survived ? `el archivo sigue (${r.error?.message ?? "sin efecto"})` : "¡se borró!");
    const head = await fetch(admin.storage.from("media").getPublicUrl(path).data.publicUrl, { method: "HEAD" });
    check("lectura pública por URL", head.ok, `${head.status} ${head.headers.get("content-type")}`);
  } else {
    check("anon NO borra en Storage", false, "no hay archivos para probar (corra seed:images)");
  }

  // --- 6. Latido con la clave secreta ---------------------------------------
  {
    const r = await admin.rpc("record_heartbeat", { source: "manual" });
    const payload = r.data as { pinged_at?: string; active_campaigns?: number } | null;
    const { data: last } = await admin
      .from("heartbeat")
      .select("id, source, pinged_at")
      .order("pinged_at", { ascending: false })
      .limit(1)
      .single();
    check(
      "service_role ejecuta record_heartbeat y queda la fila",
      !r.error && last?.pinged_at === payload?.pinged_at,
      r.error ? r.error.message : `fila ${last?.id} (${last?.source}) · activas: ${payload?.active_campaigns}`,
    );
    const bad = await admin.rpc("record_heartbeat", { source: "otro" });
    check("record_heartbeat rechaza un origen no permitido", Boolean(bad.error), bad.error?.message ?? "¡aceptó!");
  }

  // --- Resumen ----------------------------------------------------------------
  const width = Math.max(...results.map((r) => r.name.length));
  for (const r of results) console.log(`${r.ok ? "OK   " : "FALLA"} ${r.name.padEnd(width)}  ${r.detail}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `\n${failed} prueba(s) fallaron.` : `\nTodas las pruebas pasaron (${results.length}).`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
