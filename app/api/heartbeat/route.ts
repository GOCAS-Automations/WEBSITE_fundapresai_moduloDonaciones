/**
 * GET /api/heartbeat · Latido de Supabase (plan §10.1)
 *
 * Supabase Free pausa el proyecto tras 7 días sin actividad. Este endpoint hace
 * una ESCRITURA y una LECTURA reales en Postgres mediante la función
 * record_heartbeat(source) (security definer, ejecutable solo por service_role).
 *
 * Lo llaman: Vercel Cron (diario, vercel.json) y GitHub Actions (cada 2 días).
 * Exige `Authorization: Bearer ${CRON_SECRET}`; sin él responde 401.
 *
 * Nota Next 16: con Cache Components no se permiten `export const runtime` ni
 * `export const dynamic`. La ruta corre siempre en Node.js (único runtime de
 * Cache Components) y es dinámica porque lee request.headers: nunca se
 * prerenderiza ni se cachea.
 */
import { timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

const sourceSchema = z.enum(["vercel-cron", "github-action", "manual"]);

const resultSchema = z.object({
  pinged_at: z.string(),
  active_campaigns: z.number().int(),
});

function isAuthorized(header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");

  if (!secret) {
    console.error("[heartbeat] Falta CRON_SECRET en las variables de entorno.");
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  if (!isAuthorized(authorization, secret)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  // Origen: ?source=... explícito; si no, Vercel Cron se identifica por su user-agent.
  const userAgent = request.headers.get("user-agent") ?? "";
  const rawSource =
    new URL(request.url).searchParams.get("source") ??
    (userAgent.startsWith("vercel-cron") ? "vercel-cron" : "manual");
  const source = sourceSchema.safeParse(rawSource);
  if (!source.success) {
    return Response.json({ ok: false, error: "invalid_source" }, { status: 400, headers: NO_STORE });
  }

  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase.rpc("record_heartbeat", { source: source.data });
    if (error) throw new Error(`${error.code ?? ""} ${error.message}`.trim());

    const result = resultSchema.parse(data);
    return Response.json(
      { ok: true, source: source.data, pinged_at: result.pinged_at, active_campaigns: result.active_campaigns },
      { status: 200, headers: NO_STORE },
    );
  } catch (err) {
    console.error("[heartbeat] Falló el latido de Supabase:", err instanceof Error ? err.message : err);
    return Response.json({ ok: false, error: "heartbeat_failed" }, { status: 500, headers: NO_STORE });
  }
}
