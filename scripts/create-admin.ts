/**
 * Crea (o confirma) una cuenta de ADMINISTRADOR NORMAL del panel (is_super =
 * false): edita el sitio y las campañas, pero no gestiona usuarios.
 *
 * Uso:  npm run admin:user -- --username angela --name "Angela María Ramírez" [--reset-password]
 *
 * - Si no existe: la crea confirmada, con su correo interno
 *   (<usuario>@fundapresai.invalid) y una contraseña FÁCIL de escribir en el
 *   celular (tres palabras sin tildes y dos dígitos: scripts/lib/memorable-password.ts).
 * - Si ya existe: no la duplica ni cambia su contraseña ni su nombre (con
 *   --reset-password le pone una nueva del mismo tipo). Nunca la convierte en
 *   administrador general ni le quita ese rol.
 * La contraseña va SOLO a .credenciales-admin.local (ignorado por git; se
 * comprueba antes de crear nada) y nunca se imprime. Lo mismo se puede hacer
 * desde el panel, en «Usuarios», con la cuenta del administrador general.
 */
import path from "node:path";

import { usernameSchema, usernameToEmail } from "../lib/admin/username";
import { assertIgnoredByGit, CREDENTIALS, findAuthUserByEmail, serviceClient, upsertCredential } from "./lib/accounts";
import { loadLocalEnv, ROOT } from "./lib/env";
import { generateMemorablePassword } from "./lib/memorable-password";

loadLocalEnv();

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : "";
};

async function main() {
  const username = usernameSchema.parse(arg("username"));
  const name = arg("name").trim();
  if (name.length < 2) throw new Error('Falta el nombre: --name "Nombre Apellido".');
  const email = usernameToEmail(username);
  const reset = process.argv.includes("--reset-password");
  assertIgnoredByGit(CREDENTIALS);

  const service = serviceClient();
  const { data: row, error: findError } = await service
    .from("admins")
    .select("user_id, name, is_super")
    .eq("username", username)
    .maybeSingle();
  if (findError) throw findError;

  let password: string | null = null;
  let userId = row?.user_id ?? null;
  let created = false;

  if (!userId) {
    const existing = await findAuthUserByEmail(service, email);
    if (existing) {
      userId = existing.id;
    } else {
      password = generateMemorablePassword();
      const res = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
      if (res.error) throw res.error;
      userId = res.data.user.id;
      created = true;
    }
    const insert = await service.from("admins").upsert({ user_id: userId, name, username }, { onConflict: "user_id" });
    if (insert.error) {
      if (created) await service.auth.admin.deleteUser(userId);
      throw insert.error;
    }
  }

  if (reset && !created) {
    password = generateMemorablePassword();
    const res = await service.auth.admin.updateUserById(userId, { password });
    if (res.error) throw res.error;
  }

  const { data: saved, error } = await service.from("admins").select("name, is_super").eq("user_id", userId).single();
  if (error) throw error;

  if (password) {
    upsertCredential({
      username,
      email: null,
      name: saved.name,
      isSuper: saved.is_super,
      password,
      note: "Contraseña nueva: entréguela en persona o por un mensaje privado.",
    });
  }

  const file = path.relative(ROOT, CREDENTIALS);
  console.log(
    created
      ? `Cuenta creada: usuario «${username}», ${saved.name} (administrador general = ${saved.is_super}). Contraseña en ${file}.`
      : `La cuenta «${username}» ya existía (administrador general = ${saved.is_super}): no se duplicó.` +
          (password ? ` Contraseña restablecida; la nueva está en ${file}.` : " No se cambió su contraseña."),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
