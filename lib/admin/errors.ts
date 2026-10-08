/**
 * Traduce errores de Supabase (Auth, PostgREST, Storage y red) a mensajes en
 * español claro, con trato de usted. Sirve en el servidor y en el navegador.
 * El detalle técnico se registra en la consola, nunca se muestra a Angela.
 */

type MaybeError = {
  message?: string;
  code?: string;
  status?: number;
  statusCode?: string | number;
  name?: string;
} | null | undefined;

const GENERIC = "No se pudo completar la acción. Intente de nuevo en un momento; si sigue pasando, escriba a GOCAS.";

export function humanizeError(error: unknown, context?: string): string {
  const e = (typeof error === "object" ? error : { message: String(error) }) as MaybeError;
  const msg = (e?.message ?? "").toLowerCase();
  const code = String(e?.code ?? "");
  const status = Number(e?.status ?? e?.statusCode ?? 0);

  if (context) console.error(`[panel] ${context}:`, e?.message ?? error, code || "", status || "");

  // Red / conexión
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("fetch failed")) {
    return "No hay conexión con el servidor. Revise su internet e intente de nuevo.";
  }

  // Auth
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return "El correo o la contraseña no son correctos. Revíselos e intente de nuevo.";
  }
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return "Esta cuenta aún no está confirmada. Escriba a GOCAS para activarla.";
  }
  if (code === "user_banned") return "Esta cuenta está bloqueada. Escriba a GOCAS.";
  if (code === "same_password" || msg.includes("should be different from the old password")) {
    return "La nueva contraseña debe ser distinta de la anterior.";
  }
  if (code === "weak_password" || msg.includes("password should be")) {
    return "La contraseña es muy débil. Use al menos 8 caracteres, mezclando letras y números.";
  }
  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    status === 429 ||
    msg.includes("rate limit") ||
    msg.includes("for security purposes, you can only request")
  ) {
    return "Se hicieron demasiados intentos seguidos. Espere unos minutos e intente de nuevo.";
  }
  if (code === "email_address_not_authorized" || (msg.includes("not authorized") && msg.includes("email"))) {
    return "Por ahora el sitio no puede enviar correos a esa dirección. Escriba a GOCAS para restablecer su contraseña.";
  }
  if (code === "email_address_invalid") {
    return "No pudimos enviar el correo a esa dirección. Revise que esté bien escrita; si sigue pasando, escriba a GOCAS.";
  }
  if (code === "session_not_found" || code === "refresh_token_not_found" || msg.includes("auth session missing")) {
    return "Su sesión se cerró. Vuelva a entrar con su correo y contraseña.";
  }
  if (code === "otp_expired" || msg.includes("expired")) {
    return "El enlace ya venció o ya se usó. Pida uno nuevo.";
  }

  // Base de datos (PostgREST / Postgres)
  if (code === "23505") return "Ya existe un registro con esos datos. Cambie el valor repetido e intente de nuevo.";
  if (code === "42501" || msg.includes("row-level security") || msg.includes("permission denied")) {
    return "Su cuenta no tiene permiso para hacer este cambio.";
  }
  if (code === "23514" || code === "22P02" || code === "23502") {
    return "Algún dato no tiene el formato correcto. Revise los campos e intente de nuevo.";
  }
  if (code === "PGRST116" || code === "P0002") return "No encontramos ese registro. Puede que alguien lo haya borrado.";

  // Storage
  if (status === 413 || msg.includes("payload too large") || msg.includes("exceeded the maximum allowed size")) {
    return "La imagen pesa demasiado (máximo 5 MB). Pruebe con otra foto.";
  }
  if (msg.includes("mime type") || msg.includes("invalid_mime_type")) {
    return "Ese tipo de archivo no está permitido. Use una foto JPG, PNG o WebP.";
  }
  if (msg.includes("already exists") || msg.includes("duplicate")) {
    return "Ya existe un archivo con ese nombre. Intente de nuevo.";
  }

  return GENERIC;
}
