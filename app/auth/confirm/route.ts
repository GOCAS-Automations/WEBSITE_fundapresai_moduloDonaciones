import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { isPasswordRecoveryEnabled } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Enlaces de los correos de Auth (recuperar contraseña e invitación).
 *
 * Dos formatos, según la plantilla del correo:
 * - `?token_hash=…&type=recovery&next=/admin/restablecer` — plantillas propias
 *   (scripts/configure-auth.ts, requiere SMTP). verifyOtp() funciona aunque el
 *   correo se abra en otro dispositivo.
 * - `?code=…&next=…` — plantilla por defecto de Supabase con PKCE (el
 *   navegador que pidió el correo guardó el «code verifier» en una cookie).
 *   Solo funciona en el mismo navegador donde se pidió.
 * Si todo sale bien, la persona queda con sesión y va a definir la nueva
 * contraseña; si no, vuelve a «¿Olvidó su contraseña?» con un aviso.
 *
 * INACTIVO por defecto (no hay SMTP): sin PASSWORD_RECOVERY_ENABLED=true
 * redirige al login sin tocar el enlace.
 */
const OTP_TYPES: EmailOtpType[] = ["recovery", "invite", "magiclink", "email", "signup", "email_change"];

function safeNext(value: string | null): string {
  return value && /^\/admin(\/[a-z0-9\-/]*)?$/.test(value) ? value : "/admin/restablecer";
}

export async function GET(request: NextRequest) {
  if (!isPasswordRecoveryEnabled()) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const { searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const fail = (reason: string) => {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/recuperar";
    url.search = `?error=${reason}`;
    return NextResponse.redirect(url);
  };

  // Supabase devuelve el error en la URL si el enlace venció o ya se usó.
  if (searchParams.get("error")) return fail("enlace");

  const supabase = await createSupabaseServerClient();
  let ok = false;

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) console.error("[auth/confirm] verifyOtp:", error.code ?? error.message);
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error("[auth/confirm] exchangeCodeForSession:", error.code ?? error.message);
    if (error?.code === "bad_code_verifier" || error?.message.toLowerCase().includes("code verifier")) {
      return fail("navegador");
    }
    ok = !error;
  }

  if (!ok) return fail("enlace");

  const url = request.nextUrl.clone();
  url.pathname = next;
  url.search = "";
  return NextResponse.redirect(url);
}
