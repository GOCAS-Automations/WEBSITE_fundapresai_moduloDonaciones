import "server-only";

import { createClient } from "@supabase/supabase-js";

import { requireSupabasePublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente con la clave SECRETA (service_role / sb_secret_...). Salta RLS y
 * puede usar auth.admin (crear, modificar y borrar usuarios de Auth).
 *
 * Usos permitidos (y ningún otro; ESLint lo restringe en eslint.config.mjs):
 * 1. app/api/heartbeat/route.ts — latido de Supabase (plan §10.1 y §12).
 * 2. lib/admin/accounts.ts — gestión de usuarios del panel (fase 5): solo
 *    DESPUÉS de verificar con la sesión y RLS que quien llama es
 *    administrador general (requireSuperAdmin) o, para su propio nombre,
 *    administrador (updateOwnAdminName).
 * Los scripts locales (scripts/*.ts) crean su propio cliente.
 */
export function createSupabaseServiceRoleClient() {
  const { url } = requireSupabasePublicEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY (variable solo de servidor).");
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
