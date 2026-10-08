/**
 * Contraseñas del panel: reglas (Zod) y generador seguro. Sirve en el
 * navegador («Generar contraseña segura») y en Node (scripts): ambos tienen
 * crypto.getRandomValues.
 */
import { z } from "zod";

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 72; // límite de bcrypt en Supabase Auth

export const PASSWORD_HINT = `Al menos ${PASSWORD_MIN} caracteres, con letras y números.`;

/** Nueva contraseña: mínimo 10 caracteres, con letras y números. */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use al menos ${PASSWORD_MIN} caracteres.`)
  .max(PASSWORD_MAX, `Use máximo ${PASSWORD_MAX} caracteres.`)
  .refine((v) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(v) && /\d/.test(v), "Mezcle letras y números.");

// Sin caracteres que se confunden al leerlos o dictarlos: 0/O/o, 1/l/I.
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const ALPHABET = UPPER + LOWER + DIGITS;

/** Índice uniforme en [0, n) sin sesgo de módulo (muestreo por rechazo). */
function randomIndex(n: number): number {
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
}

/**
 * Contraseña aleatoria fuerte (por defecto 16 caracteres ≈ 93 bits) con al
 * menos una mayúscula, una minúscula y un número, sin caracteres ambiguos.
 */
export function generatePassword(length = 16): string {
  for (;;) {
    let out = "";
    for (let i = 0; i < length; i++) out += ALPHABET[randomIndex(ALPHABET.length)];
    if (/[A-Z]/.test(out) && /[a-z]/.test(out) && /\d/.test(out)) return out;
  }
}
