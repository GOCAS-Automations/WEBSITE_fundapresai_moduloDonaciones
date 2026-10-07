import "server-only";

import { createClient } from "@supabase/supabase-js";

import { requireSupabasePublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente con la clave SECRETA (service_role / sb_secret_...). Salta RLS.
 *
 * USO EXCLUSIVO de app/api/heartbeat/route.ts (plan §10.1 y §12).
 * No importarlo en ningún otro archivo de la app. Los scripts locales
 * (scripts/*.ts) crean su propio cliente.
 */
export function createSupabaseServiceRoleClient() {
  const { url } = requireSupabasePublicEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY (variable solo de servidor).");
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
