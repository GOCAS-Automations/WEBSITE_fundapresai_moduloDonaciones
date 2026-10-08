/**
 * Crea, confirma o migra la cuenta de ADMINISTRADOR GENERAL del panel.
 *
 * Uso:  npm run admin:super [-- --username admin --name "Nombre"] [-- --from-email correo] [-- --reset-password]
 *       (por defecto, la de Cesar: usuario «admin» · «Cesar Castaño · GOCAS»,
 *        migrada desde su cuenta anterior por correo, cesarxemiliox@gmail.com)
 *
 * Idempotente. En orden:
 * 1. Si ya hay una cuenta con ese usuario: solo se asegura de que su correo
 *    interno (<usuario>@fundapresai.invalid) esté bien y de que sea
 *    administrador general. No cambia la contraseña ni el nombre.
 * 2. Si no, y existe la cuenta ANTERIOR por correo (--from-email): la migra:
 *    le pone el correo interno y `admins.username`, y conserva su nombre, su
 *    is_super y SU CONTRASEÑA (Auth no la toca al cambiar el correo). En
 *    .credenciales-admin.local pasa la contraseña del bloque «Correo:» al del
 *    usuario, con la nota de que no cambió (sin leerla en voz alta: nunca se
 *    imprime).
 * 3. Si no existe ninguna: la crea confirmada con una contraseña aleatoria de
 *    20 caracteres, que va SOLO al archivo de credenciales.
 * --reset-password (si olvida la suya; no hay SMTP): contraseña aleatoria nueva,
 * también solo en el archivo. El archivo debe estar ignorado por git (se
 * comprueba con `git check-ignore` antes de tocar nada).
 */
import { existsSync } from "node:fs";
import path from "node:path";

import type { User } from "@supabase/supabase-js";

import { generatePassword } from "../lib/admin/password";
import { usernameSchema, usernameToEmail } from "../lib/admin/username";
import {
  assertIgnoredByGit,
  CREDENTIALS,
  findAuthUserByEmail,
  readCredentials,
  serviceClient,
  upsertCredential,
} from "./lib/accounts";
import { loadLocalEnv, ROOT } from "./lib/env";

loadLocalEnv();

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const USERNAME = usernameSchema.parse(arg("username", "admin"));
const EMAIL = usernameToEmail(USERNAME);
const NAME = arg("name", "Cesar Castaño · GOCAS").trim();
/** Cuenta anterior por correo: por defecto solo la de Cesar, y solo para el usuario «admin». */
const FROM_EMAIL = arg("from-email", USERNAME === "admin" ? "cesarxemiliox@gmail.com" : "").trim().toLowerCase();
const UNCHANGED_NOTE = "Tu contraseña no cambió: es la misma de antes.";

const service = serviceClient();

async function main() {
  assertIgnoredByGit(CREDENTIALS);
  const reset = process.argv.includes("--reset-password");
  let action: "existia" | "migrada" | "creada" = "existia";
  let user: User | null = null;

  // 1. ¿Ya existe con este usuario (fila en admins o correo interno en Auth)?
  const { data: byUsername, error: findError } = await service
    .from("admins")
    .select("user_id")
    .eq("username", USERNAME)
    .maybeSingle();
  if (findError) throw findError;
  if (byUsername) {
    const res = await service.auth.admin.getUserById(byUsername.user_id);
    if (res.error) throw res.error;
    user = res.data.user;
  } else {
    user = await findAuthUserByEmail(service, EMAIL);
  }

  // 2. Si no, la cuenta anterior por correo → se migra (misma contraseña).
  if (!user && FROM_EMAIL) {
    const legacy = await findAuthUserByEmail(service, FROM_EMAIL);
    if (legacy) {
      user = legacy;
      action = "migrada";
    }
  }

  // 3. Si no existe ninguna, se crea.
  let newPassword: string | null = null;
  if (!user) {
    newPassword = generatePassword(20);
    const res = await service.auth.admin.createUser({
      email: EMAIL,
      password: newPassword,
      email_confirm: true,
      user_metadata: { name: NAME },
    });
    if (res.error) throw res.error;
    user = res.data.user;
    action = "creada";
  }

  // Correo interno (no cambia la contraseña).
  if (user.email?.toLowerCase() !== EMAIL) {
    const res = await service.auth.admin.updateUserById(user.id, { email: EMAIL, email_confirm: true });
    if (res.error) throw res.error;
  }

  // Fila en `admins`: administrador general con este usuario, sin pisar el nombre que ya tenga.
  const { data: row } = await service.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  const { error } = row
    ? await service.from("admins").update({ is_super: true, username: USERNAME }).eq("user_id", user.id)
    : await service.from("admins").insert({ user_id: user.id, name: NAME, username: USERNAME, is_super: true });
  if (error) {
    if (action === "creada") await service.auth.admin.deleteUser(user.id);
    throw error;
  }

  if (reset && action !== "creada") {
    newPassword = generatePassword(20);
    const res = await service.auth.admin.updateUserById(user.id, { password: newPassword });
    if (res.error) throw res.error;
  }

  const { data: saved } = await service.from("admins").select("name, is_super").eq("user_id", user.id).single();
  const name = saved?.name || NAME;

  // Archivo de credenciales: contraseña nueva, o la de la cuenta anterior pasada al usuario.
  const file = path.relative(ROOT, CREDENTIALS);
  let fileNote = "";
  if (newPassword) {
    upsertCredential({ username: USERNAME, email: null, name, isSuper: true, password: newPassword, note: "" });
    fileNote = ` La contraseña nueva está en ${file}.`;
  } else {
    const entries = readCredentials();
    const hasEntry = entries.some((e) => e.username === USERNAME);
    const legacy = entries.find((e) => e.email === FROM_EMAIL);
    if (!hasEntry && legacy) {
      upsertCredential(
        { username: USERNAME, email: null, name, isSuper: true, password: legacy.password, note: UNCHANGED_NOTE },
        { replaceEmail: FROM_EMAIL },
      );
      fileNote = ` En ${file} quedó con el usuario «${USERNAME}» y la misma contraseña.`;
    }
  }

  const summary = {
    creada: `Cuenta creada: usuario «${USERNAME}» (administrador general = ${saved?.is_super}).`,
    migrada: `Cuenta ${FROM_EMAIL} migrada al usuario «${USERNAME}» (${EMAIL}): mismo nombre y misma contraseña; administrador general = ${saved?.is_super}.`,
    existia: `La cuenta «${USERNAME}» ya existía: no se duplicó ni se cambió su contraseña. Administrador general = ${saved?.is_super}.`,
  }[action];
  console.log(
    summary +
      (reset && action !== "creada" ? " Contraseña restablecida." : "") +
      fileNote +
      (!newPassword && !existsSync(CREDENTIALS) ? " (Si olvidó la contraseña: npm run admin:super -- --reset-password)" : ""),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
