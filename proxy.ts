import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/** Rutas del panel que se abren sin sesión (entrar y recuperar la contraseña). */
const OPEN_PATHS = ["/admin/login", "/admin/recuperar", "/admin/restablecer"];

const isOpenPath = (path: string) => OPEN_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

/**
 * Proxy (el «middleware» de Next 16), solo para /admin:
 * 1. Refresca la sesión de Supabase en cada visita.
 * 2. Sin sesión → /admin/login?next=<ruta>.
 * Primera capa de protección: el layout del panel y cada Server Action
 * vuelven a verificar en el servidor que el usuario está en `admins`.
 */
export async function proxy(request: NextRequest) {
  const { response, hasUser } = await updateSession(request);
  const path = request.nextUrl.pathname;

  // Las Server Actions responden ellas mismas «su sesión se cerró» (un 307 rompería la llamada).
  const isServerAction = request.method === "POST" && request.headers.has("next-action");

  if (!hasUser && !isOpenPath(path) && !isServerAction) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    if (path !== "/admin") url.searchParams.set("next", path);
    const redirect = NextResponse.redirect(url);
    // Conserva las cookies que haya limpiado Supabase (sesión vencida).
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  if (hasUser && path === "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
