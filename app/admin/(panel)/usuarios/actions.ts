"use server";

/**
 * Server Actions de «Usuarios» (solo administrador general). Cada una:
 * 1. verifica en el servidor, con la sesión y RLS, que quien llama es
 *    administrador general (requireSuperAdmin → is_admin() + is_super_admin());
 * 2. valida con Zod;
 * 3. solo entonces usa la clave secreta (auth.admin y `admins`).
 * No hay correos: las contraseñas se entregan en persona (se muestran una
 * sola vez en el navegador de quien las creó; aquí nunca se devuelven).
 */
import { refresh } from "next/cache";
import { z } from "zod";

import { requireSuperAdmin } from "@/lib/admin/accounts";
import { ACCESS_MESSAGES, fail, ok, VALIDATION_MESSAGE, type ActionState } from "@/lib/admin/action-state";
import { humanizeError } from "@/lib/admin/errors";
import { newPasswordSchema } from "@/lib/admin/password";
import { fieldErrors } from "@/lib/validations";

const MESSAGES = {
  ...ACCESS_MESSAGES,
  "no-super": "Solo el administrador general puede gestionar las cuentas del panel.",
} as const;

const nameSchema = z
  .string()
  .trim()
  .min(2, "Escriba el nombre de la persona.")
  .max(120, "Use máximo 120 caracteres.");

const createSchema = z.object({
  name: nameSchema,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Escriba el correo completo. Ejemplo: nombre@dominio.org")),
  password: newPasswordSchema,
});

const idSchema = z.uuid();

/** Fila de `admins` del usuario objetivo (con la clave secreta, ya verificado). */
async function findTarget(service: Extract<Awaited<ReturnType<typeof requireSuperAdmin>>, { ok: true }>["service"], id: string) {
  const { data, error } = await service.from("admins").select("user_id, name, is_super").eq("user_id", id).maybeSingle();
  return { target: data, error };
}

export async function createPanelUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return fail(MESSAGES[auth.reason]);

  const parsed = createSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return fail(VALIDATION_MESSAGE, fieldErrors(parsed.error));
  const { name, email, password } = parsed.data;

  // Sin correo de confirmación: la cuenta nace confirmada.
  const created = await auth.service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (created.error) {
    const e = created.error;
    if (e.code === "email_exists" || /already (been )?registered|already exists/i.test(e.message)) {
      return fail(VALIDATION_MESSAGE, { email: "Ya existe una cuenta con este correo. Revise la lista de cuentas." });
    }
    return fail(humanizeError(e, "crear usuario"));
  }

  const insert = await auth.service.from("admins").insert({ user_id: created.data.user.id, name });
  if (insert.error) {
    // Deshacer: no dejar un usuario de Auth sin acceso al panel.
    await auth.service.auth.admin.deleteUser(created.data.user.id);
    return fail(humanizeError(insert.error, "crear admin"));
  }

  refresh();
  return ok(`Se creó la cuenta de ${name}. Ya puede entrar al panel con su correo y esta contraseña.`);
}

export async function resetPanelUserPassword(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return fail(MESSAGES[auth.reason]);
  if (!idSchema.safeParse(userId).success) return fail("Esa cuenta no existe.");
  if (userId === auth.user.id) return fail("Para cambiar su propia contraseña use «Mi cuenta».");

  const parsed = newPasswordSchema.safeParse(String(formData.get("password") ?? ""));
  if (!parsed.success) return fail(VALIDATION_MESSAGE, { password: parsed.error.issues[0]?.message ?? "Revise la contraseña." });

  const { target, error } = await findTarget(auth.service, userId);
  if (error) return fail(humanizeError(error, "leer admin"));
  if (!target) return fail("No encontramos esa cuenta: puede que ya no tenga acceso.");

  const updated = await auth.service.auth.admin.updateUserById(userId, { password: parsed.data });
  if (updated.error) return fail(humanizeError(updated.error, "restablecer contraseña"));

  return ok(`Se restableció la contraseña de ${target.name || "la cuenta"}.`);
}

export async function renamePanelUser(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return fail(MESSAGES[auth.reason]);
  if (!idSchema.safeParse(userId).success) return fail("Esa cuenta no existe.");

  const parsed = nameSchema.safeParse(String(formData.get("name") ?? ""));
  if (!parsed.success) return fail(VALIDATION_MESSAGE, { name: parsed.error.issues[0]?.message ?? "Revise el nombre." });

  const { data, error } = await auth.service.from("admins").update({ name: parsed.data }).eq("user_id", userId).select("user_id");
  if (error) return fail(humanizeError(error, "editar nombre"));
  if (!data.length) return fail("No encontramos esa cuenta: puede que ya no tenga acceso.");

  refresh();
  return ok(`Se guardó el nombre «${parsed.data}».`);
}

export async function removePanelUser(userId: string): Promise<ActionState> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return fail(MESSAGES[auth.reason]);
  if (!idSchema.safeParse(userId).success) return fail("Esa cuenta no existe.");
  if (userId === auth.user.id) return fail("No puede quitarse el acceso a usted mismo.");

  const { target, error } = await findTarget(auth.service, userId);
  if (error) return fail(humanizeError(error, "leer admin"));
  if (!target) return fail("Esa cuenta ya no tiene acceso al panel.");

  if (target.is_super) {
    const { count, error: countError } = await auth.service
      .from("admins")
      .select("user_id", { count: "exact", head: true })
      .eq("is_super", true);
    if (countError) return fail(humanizeError(countError, "contar administradores generales"));
    if ((count ?? 0) <= 1) return fail("No se puede quitar al último administrador general.");
  }

  // Borrar el usuario de Auth borra su fila en `admins` (on delete cascade);
  // el borrado explícito de abajo es por si la cascada cambiara algún día.
  const removed = await auth.service.auth.admin.deleteUser(userId);
  if (removed.error) {
    if (/último administrador general/i.test(removed.error.message)) {
      return fail("No se puede quitar al último administrador general.");
    }
    return fail(humanizeError(removed.error, "quitar acceso"));
  }
  await auth.service.from("admins").delete().eq("user_id", userId);

  refresh();
  return ok(`Se quitó el acceso de ${target.name || "la cuenta"} y se borró su usuario.`);
}
