/**
 * Usuarios del panel (fase 6): se entra con un USUARIO («admin», «angela»),
 * no con un correo. Sirve en el servidor, en el navegador y en los scripts.
 *
 * Supabase Auth exige un correo, así que cada cuenta usa uno INTERNO y
 * determinista: <usuario>@fundapresai.invalid. Nunca recibe correos: no hay
 * SMTP, la cuenta nace confirmada (email_confirm) y `.invalid` es un dominio
 * reservado que no existe ni puede registrarse (RFC 2606 y RFC 6761), así que
 * no pertenece a nadie. Probado el 2026-10-08: GoTrue lo acepta al crear la
 * cuenta, al entrar y al cambiar el correo con auth.admin.
 *
 * El usuario vive en `admins.username` (único; la base valida el mismo
 * formato) y en el correo interno de Auth: los dos se cambian juntos.
 */
import { z } from "zod";

/** ÚNICO lugar donde se define el dominio de los correos internos (ver README, «Cuentas del panel»). */
export const INTERNAL_EMAIL_DOMAIN = "fundapresai.invalid";

/** Mismo patrón que la restricción `admins_username_formato` de la base. */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export const USERNAME_HINT =
  "De 3 a 30 caracteres: letras sin tildes, números, punto, guion o guion bajo. Se guarda en minúsculas.";

/** Lo que escribe la persona → usuario normalizado (sin espacios a los lados y en minúsculas). */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Usuario válido. Además del patrón, sin dos puntos seguidos ni punto al
 * final: el correo interno no sería un correo válido.
 */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Escriba el usuario.")
  .min(3, "Use al menos 3 caracteres.")
  .max(30, "Use máximo 30 caracteres.")
  .regex(USERNAME_PATTERN, "Use solo letras sin tildes, números, punto, guion o guion bajo, y empiece con letra o número.")
  .refine((v) => !v.includes("..") && !v.endsWith("."), "No use dos puntos seguidos ni termine en punto.");

/** Usuario → correo interno de Supabase Auth. */
export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${INTERNAL_EMAIL_DOMAIN}`;
}

/** Correo interno → usuario (null si el correo no es interno). */
export function usernameFromEmail(email: string | null | undefined): string | null {
  const suffix = `@${INTERNAL_EMAIL_DOMAIN}`;
  const value = (email ?? "").toLowerCase();
  return value.endsWith(suffix) ? value.slice(0, -suffix.length) : null;
}
