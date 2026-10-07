import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente ANÓNIMO sin sesión ni cookies, para leer el contenido público
 * (solo lo que RLS deja ver a anon). Es el que usa lib/content.ts dentro de
 * funciones "use cache", donde no se pueden leer cookies.
 *
 * Devuelve null si Supabase no está configurado (el build no debe romperse).
 */
export function createSupabasePublicClient() {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  return createClient<Database>(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
