import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Refresca la sesión de Supabase en el proxy (middleware de Next 16) y la
 * devuelve en las cookies de la respuesta. Patrón oficial de @supabase/ssr:
 * nada de código entre createServerClient y getClaims().
 *
 * Esto es solo una verificación OPTIMISTA para redirigir rápido. La
 * autorización real (is_admin) se hace en el servidor: layout del panel y
 * cada Server Action (lib/supabase/server.ts → requireAdmin).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getSupabasePublicEnv();
  if (!env) return { response, hasUser: false };

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Cabeceras anti-caché que manda @supabase/ssr al renovar la sesión.
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  return { response, hasUser: Boolean(data?.claims?.sub) };
}
