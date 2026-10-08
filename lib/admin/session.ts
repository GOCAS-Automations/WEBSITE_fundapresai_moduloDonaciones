import "server-only";

import { cache } from "react";

import { requireAdmin } from "@/lib/supabase/server";

/**
 * requireAdmin() una sola vez por petición (layout + página la comparten).
 * Las Server Actions llaman a requireAdmin() directamente: cada una es su
 * propia petición y nunca confían en lo que verificó la página.
 */
export const getAdminContext = cache(requireAdmin);

/** ¿El usuario de esta petición es administrador general? (is_super_admin() con su sesión y RLS). */
export const getIsSuperAdmin = cache(async (): Promise<boolean> => {
  const ctx = await getAdminContext();
  if (!ctx.ok) return false;
  const { data, error } = await ctx.supabase.rpc("is_super_admin");
  return !error && data === true;
});
