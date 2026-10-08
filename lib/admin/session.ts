import "server-only";

import { cache } from "react";

import { requireAdmin } from "@/lib/supabase/server";

/**
 * requireAdmin() una sola vez por petición (layout + página la comparten).
 * Las Server Actions llaman a requireAdmin() directamente: cada una es su
 * propia petición y nunca confían en lo que verificó la página.
 */
export const getAdminContext = cache(requireAdmin);
