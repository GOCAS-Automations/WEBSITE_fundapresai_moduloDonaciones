/**
 * Utilidades de los scripts de cuentas del panel (admin:super y admin:user):
 * cliente con la clave secreta, búsqueda de usuarios de Auth y el archivo de
 * credenciales `.credenciales-admin.local` (ignorado por git).
 *
 * Las contraseñas solo se escriben en ese archivo: NUNCA se imprimen.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createClient, type User } from "@supabase/supabase-js";

import type { Database } from "../../lib/supabase/database.types";
import { requireEnv, ROOT } from "./env";

export const CREDENTIALS = path.join(ROOT, ".credenciales-admin.local");

export function serviceClient() {
  return createClient<Database>(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export type Service = ReturnType<typeof serviceClient>;

/** Dirección pública del panel para el archivo de credenciales (nunca localhost). */
export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return env && !/\/\/(localhost|127\.0\.0\.1)(:|$)/.test(env) ? env : "https://fundapresai-donaciones.vercel.app";
}

/** El archivo de credenciales debe estar ignorado por git ANTES de escribir nada. */
export function assertIgnoredByGit(file = CREDENTIALS) {
  try {
    execFileSync("git", ["check-ignore", "-q", path.relative(ROOT, file)], { cwd: ROOT, stdio: "ignore" });
  } catch {
    throw new Error(`${path.basename(file)} NO está ignorado por git. Agregue la regla a .gitignore antes de seguir.`);
  }
}

export async function findAuthUserByEmail(service: Service, email: string): Promise<User | null> {
  const wanted = email.toLowerCase();
  for (let page = 1; page < 50; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === wanted);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

// -----------------------------------------------------------------------------
// Archivo de credenciales
// -----------------------------------------------------------------------------

export type CredentialEntry = {
  /** Usuario para entrar (o null en el formato anterior, que traía «Correo:»). */
  username: string | null;
  /** Solo en el formato anterior (fase 5). */
  email: string | null;
  name: string;
  isSuper: boolean;
  password: string;
  note: string;
};

const FIELDS = {
  name: "Nombre: ",
  role: "Permisos: ",
  username: "Usuario: ",
  email: "Correo: ",
  password: "Contraseña: ",
  note: "Nota: ",
} as const;

const SUPER_LABEL = "Administrador general (gestiona las cuentas)";
const ADMIN_LABEL = "Administrador del sitio (edita el sitio y las campañas)";

/**
 * Lee el archivo (formato actual con bloques «== Cuenta ==» o el anterior, de
 * una sola cuenta con «Correo:»). Devuelve solo las cuentas con contraseña.
 */
export function readCredentials(): CredentialEntry[] {
  if (!existsSync(CREDENTIALS)) return [];
  const lines = readFileSync(CREDENTIALS, "utf8").split(/\r?\n/);
  const entries: CredentialEntry[] = [];
  let current: CredentialEntry | null = null;
  const fresh = (): CredentialEntry => ({ username: null, email: null, name: "", isSuper: false, password: "", note: "" });
  const flush = () => {
    if (current?.password) entries.push(current);
    current = null;
  };
  for (const line of lines) {
    if (line.startsWith("== ")) {
      flush();
      current = fresh();
      continue;
    }
    const field = (Object.keys(FIELDS) as (keyof typeof FIELDS)[]).find((k) => line.startsWith(FIELDS[k]));
    if (!field) continue;
    current ??= fresh();
    const value = line.slice(FIELDS[field].length);
    if (field === "role") current.isSuper = value.startsWith("Administrador general");
    else if (field === "username") current.username = value.trim().toLowerCase();
    else if (field === "email") current.email = value.trim().toLowerCase();
    else if (field === "name") current.name = value.trim();
    else if (field === "note") current.note = value.trim();
    else current.password = value;
  }
  flush();
  // Formato anterior: la única cuenta era la del administrador general.
  if (entries.length === 1 && entries[0].email && !entries[0].username) entries[0].isSuper = true;
  return entries;
}

/** Reescribe el archivo completo con estas cuentas (el administrador general primero). */
export function writeCredentials(entries: CredentialEntry[]) {
  assertIgnoredByGit();
  const today = new Date().toISOString().slice(0, 10);
  const ordered = [...entries].sort((a, b) => Number(b.isSuper) - Number(a.isSuper));
  const blocks = ordered.map((e) =>
    [
      `== Cuenta: ${e.username ?? e.email} ==`,
      `${FIELDS.name}${e.name}`,
      `${FIELDS.role}${e.isSuper ? SUPER_LABEL : ADMIN_LABEL}`,
      e.username ? `${FIELDS.username}${e.username}` : `${FIELDS.email}${e.email}`,
      `${FIELDS.password}${e.password}`,
      ...(e.note ? [`${FIELDS.note}${e.note}`] : []),
    ].join("\n"),
  );
  writeFileSync(
    CREDENTIALS,
    [
      "Panel de Fundapresai · cuentas",
      `Entrar: ${siteUrl()}/admin/login`,
      "Se entra con el USUARIO (no con un correo) y la contraseña.",
      "",
      ...blocks.flatMap((b) => [b, ""]),
      "Cada persona puede cambiar su contraseña en «Mi cuenta» (/admin/cuenta): conviene hacerlo en el primer ingreso.",
      "Después de entregar las contraseñas, borre este archivo.",
      `Actualizado: ${today}. Este archivo está en .gitignore: nunca lo suba al repositorio ni lo comparta.`,
      "",
    ].join("\n"),
    { encoding: "utf8", mode: 0o600 },
  );
}

/** Agrega o reemplaza la cuenta `entry.username` y conserva las demás. */
export function upsertCredential(entry: CredentialEntry, options: { replaceEmail?: string } = {}) {
  const others = readCredentials().filter(
    (e) => e.username !== entry.username && !(options.replaceEmail && e.email === options.replaceEmail.toLowerCase()),
  );
  writeCredentials([...others, entry]);
}
