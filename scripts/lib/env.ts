/** Utilidades compartidas por los scripts locales (no se importan desde la app). */
import { existsSync } from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(__dirname, "..", "..");

/** Carga .env.local si existe (las variables ya definidas en el entorno tienen prioridad). */
export function loadLocalEnv(): void {
  const file = path.join(ROOT, ".env.local");
  if (existsSync(file)) process.loadEnvFile(file);
}

export function requireEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`Falta la variable ${names.join(" o ")} (en .env.local o en el entorno).`);
}

/** «https://abcd.supabase.co» → «abcd». */
export function projectRef(supabaseUrl: string): string {
  return new URL(supabaseUrl).hostname.split(".")[0];
}

/**
 * Cabeceras para la API REST de Supabase con una clave de proyecto.
 * Claves legacy (JWT eyJ...): apikey + Authorization Bearer.
 * Claves nuevas (sb_publishable_ / sb_secret_): solo apikey (no son JWT).
 */
export function supabaseKeyHeaders(key: string): Record<string, string> {
  return key.startsWith("sb_") ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };
}
