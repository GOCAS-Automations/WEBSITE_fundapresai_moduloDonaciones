import "server-only";

/**
 * Cuentas del panel (fase 5): verificación del administrador general y las
 * únicas operaciones de la app que usan la clave secreta además del latido.
 *
 * Regla: PRIMERO se verifica en el servidor, con la sesión del usuario y RLS
 * (is_admin() e is_super_admin()), quién llama; SOLO ENTONCES se crea el
 * cliente con la clave secreta (auth.admin y escrituras en `admins`). La
 * clave pública nunca puede escribir `admins` (sin privilegios en la tabla).
 */
import { createClient } from "@supabase/supabase-js";

import { requireSupabasePublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";
import { requireAdmin } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

type AdminContext = Awaited<ReturnType<typeof requireAdmin>>;

/**
 * Verifica que quien llama es administrador general. Recibe el contexto ya
 * verificado de la página (getAdminContext) o, en las Server Actions, lo
 * verifica de nuevo (cada acción es su propia petición).
 */
export async function requireSuperAdmin(verified?: AdminContext) {
  const auth = verified ?? (await requireAdmin());
  if (!auth.ok) return auth;
  const { data, error } = await auth.supabase.rpc("is_super_admin");
  if (error || data !== true) {
    if (error) console.error("[panel] is_super_admin:", error.code ?? error.message);
    return { ok: false as const, reason: "no-super" as const, supabase: auth.supabase, user: auth.user };
  }
  // Solo aquí, ya verificado, se crea el cliente con la clave secreta.
  return { ok: true as const, user: auth.user, supabase: auth.supabase, service: createSupabaseServiceRoleClient() };
}

export type PanelUser = {
  id: string;
  name: string;
  /** Usuario para entrar (admins.username). */
  username: string;
  isSuper: boolean;
  createdAt: string;
  lastSignInAt: string | null;
};

type SuperAdminOk = Extract<Awaited<ReturnType<typeof requireSuperAdmin>>, { ok: true }>;

/**
 * Cuentas con acceso al panel: filas de `admins` (leídas con la sesión: RLS
 * deja al administrador general verlas todas, con su usuario) unidas con la
 * creación y el último ingreso de Auth (auth.admin.listUsers, clave secreta).
 */
export async function listPanelUsers(auth: SuperAdminOk): Promise<{ users: PanelUser[]; error: unknown }> {
  const [admins, list] = await Promise.all([
    auth.supabase.from("admins").select("user_id, name, username, is_super, created_at").order("created_at", { ascending: true }),
    auth.service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (admins.error) return { users: [], error: admins.error };
  if (list.error) return { users: [], error: list.error };
  const byId = new Map(list.data.users.map((u) => [u.id, u]));
  const users = admins.data.map((a) => {
    const u = byId.get(a.user_id);
    return {
      id: a.user_id,
      name: a.name,
      username: a.username,
      isSuper: a.is_super,
      createdAt: u?.created_at ?? a.created_at,
      lastSignInAt: u?.last_sign_in_at ?? null,
    };
  });
  return { users, error: null };
}

/**
 * Cambia el nombre del administrador que llama (Mi cuenta). La escritura va
 * con la clave secreta, pero limitada a SU fila (user_id de la sesión ya
 * verificada con requireAdmin()).
 */
export async function updateOwnAdminName(verified: Extract<AdminContext, { ok: true }>, name: string) {
  const service = createSupabaseServiceRoleClient();
  return service.from("admins").update({ name }).eq("user_id", verified.user.id).select("user_id");
}

/**
 * Comprueba una contraseña con signInWithPassword en un cliente APARTE (sin
 * cookies): no toca la sesión del panel. La sesión de prueba se cierra al
 * momento. Devuelve el error de Auth si no es correcta.
 */
export async function verifyPassword(email: string, password: string) {
  const { url, anonKey } = requireSupabasePublicEnv();
  const probe = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await probe.auth.signInWithPassword({ email, password });
  if (!error) await probe.auth.signOut({ scope: "local" });
  return error;
}
