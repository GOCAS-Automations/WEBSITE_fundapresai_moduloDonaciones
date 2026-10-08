/**
 * Crea (o confirma) la cuenta de ADMINISTRADOR GENERAL del panel.
 *
 * Uso:  npm run admin:super [-- --email correo@dominio --name "Nombre"] [-- --reset-password]
 *       (por defecto, la de Cesar: cesarxemiliox@gmail.com · «Cesar Castaño · GOCAS»)
 *
 * - Si el usuario NO existe: lo crea confirmado (sin correo), con una
 *   contraseña aleatoria de 20 caracteres sin caracteres ambiguos, y escribe
 *   el correo y la contraseña SOLO en .credenciales-admin.local (ignorado por
 *   git; el script lo comprueba con `git check-ignore` antes de crear nada).
 * - Si ya existe: no lo duplica ni cambia su contraseña; solo se asegura de
 *   que esté en `admins` con is_super = true (sin pisar su nombre).
 * - Con --reset-password (si Cesar olvida la suya; no hay SMTP): le asigna
 *   una contraseña aleatoria nueva y la escribe en el mismo archivo.
 * La contraseña nunca se imprime en la consola.
 */
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createClient, type User } from "@supabase/supabase-js";

import { generatePassword } from "../lib/admin/password";
import type { Database } from "../lib/supabase/database.types";
import { loadLocalEnv, requireEnv, ROOT } from "./lib/env";

loadLocalEnv();

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const EMAIL = arg("email", "cesarxemiliox@gmail.com").trim().toLowerCase();
const NAME = arg("name", "Cesar Castaño · GOCAS").trim();
const CREDENTIALS = path.join(ROOT, ".credenciales-admin.local");
const SITE = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://fundapresai-donaciones.vercel.app").replace(/\/+$/, "");

const service = createClient<Database>(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
);

function assertIgnoredByGit(file: string) {
  try {
    execFileSync("git", ["check-ignore", "-q", path.relative(ROOT, file)], { cwd: ROOT, stdio: "ignore" });
  } catch {
    throw new Error(`${path.basename(file)} NO está ignorado por git. Agregue la regla a .gitignore antes de seguir.`);
  }
}

async function findUserByEmail(email: string): Promise<User | null> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

function writeCredentials(password: string, action: string) {
  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(
    CREDENTIALS,
    [
      "Panel de Fundapresai · administrador general",
      `Entrar: ${SITE}/admin/login`,
      `Correo: ${EMAIL}`,
      `Contraseña: ${password}`,
      "",
      "Cámbiela desde «Mi cuenta» (/admin/cuenta) en su primer ingreso y luego borre este archivo.",
      `${action}: ${today}. Este archivo está en .gitignore: nunca lo suba al repositorio ni lo comparta.`,
      "",
    ].join("\n"),
    { encoding: "utf8", mode: 0o600 },
  );
}

async function main() {
  assertIgnoredByGit(CREDENTIALS);
  const reset = process.argv.includes("--reset-password");

  let user = await findUserByEmail(EMAIL);
  let created = false;

  if (!user) {
    const password = generatePassword(20);
    const res = await service.auth.admin.createUser({
      email: EMAIL,
      password,
      email_confirm: true,
      user_metadata: { name: NAME },
    });
    if (res.error) throw res.error;
    user = res.data.user;
    created = true;
    writeCredentials(password, "Creado");
  } else if (reset) {
    // Recuperación para el propio administrador general (no hay SMTP).
    const password = generatePassword(20);
    const res = await service.auth.admin.updateUserById(user.id, { password });
    if (res.error) throw res.error;
    writeCredentials(password, "Restablecida");
  }

  // Fila en `admins` como administrador general, sin duplicar ni pisar el nombre que ya tenga.
  const { data: existing } = await service.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  const { error } = existing
    ? await service.from("admins").update({ is_super: true }).eq("user_id", user.id)
    : await service.from("admins").insert({ user_id: user.id, name: NAME, is_super: true });
  if (error) {
    if (created) await service.auth.admin.deleteUser(user.id);
    throw error;
  }

  const { data: row } = await service.from("admins").select("is_super").eq("user_id", user.id).single();
  const file = path.relative(ROOT, CREDENTIALS);
  console.log(
    created
      ? `Cuenta creada: ${EMAIL} (administrador general = ${row?.is_super}). Credenciales en ${file}.`
      : reset
        ? `Contraseña de ${EMAIL} restablecida. La nueva está en ${file}.`
        : `La cuenta ${EMAIL} ya existía: no se duplicó ni se cambió su contraseña. Administrador general = ${row?.is_super}.` +
          (existsSync(CREDENTIALS) ? "" : " (Si olvidó la contraseña: npm run admin:super -- --reset-password)"),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
