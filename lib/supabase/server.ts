import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requireSupabasePublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente de servidor CON la sesión del usuario (cookies). Para el panel:
 * Server Components, Server Actions y Route Handlers de /admin.
 *
 * Crear uno nuevo por petición (no reutilizar entre peticiones).
 * No usar dentro de funciones con "use cache": leen cookies.
 */
export async function createSupabaseServerClient() {
  const { url, anonKey } = requireSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: no puede escribir cookies.
          // El proxy (proxy.ts) es quien refresca la sesión.
        }
      },
    },
  });
}

/**
 * Verifica en el SERVIDOR que quien llama es administrador (RPC is_admin()).
 * Usar en cada Server Action / Route Handler del panel: el proxy no basta.
 */
export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, reason: "sin-sesion" as const, supabase };
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || !isAdmin) return { ok: false as const, reason: "no-admin" as const, supabase, user };
  return { ok: true as const, user, supabase };
}
