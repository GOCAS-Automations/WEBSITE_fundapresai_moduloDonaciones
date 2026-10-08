"use server";

/**
 * Server Actions de «Mi cuenta» (cualquier administrador): cambiar su propia
 * contraseña (pidiendo la actual) y su nombre. Verifican is_admin() en el
 * servidor antes de todo.
 */
import { refresh } from "next/cache";
import { z } from "zod";

import { updateOwnAdminName, verifyPassword } from "@/lib/admin/accounts";
import { ACCESS_MESSAGES, fail, ok, VALIDATION_MESSAGE, type ActionState } from "@/lib/admin/action-state";
import { humanizeError } from "@/lib/admin/errors";
import { newPasswordSchema } from "@/lib/admin/password";
import { requireAdmin } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validations";

const WRONG_CURRENT = "La contraseña actual no es correcta.";

const passwordSchema = z
  .object({
    current: z.string().min(1, "Escriba su contraseña actual."),
    password: newPasswordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Las dos contraseñas no coinciden." })
  .refine((v) => v.password !== v.current, { path: ["password"], message: "La nueva contraseña debe ser distinta de la actual." });

export async function changeOwnPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireAdmin();
  if (!auth.ok) return fail(ACCESS_MESSAGES[auth.reason]);

  const parsed = passwordSchema.safeParse({
    current: String(formData.get("current") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) return fail(VALIDATION_MESSAGE, fieldErrors(parsed.error));

  const email = auth.user.email;
  if (!email) return fail("Su cuenta no tiene usuario. Pídale al administrador general que la revise.");

  // 1. La contraseña actual se comprueba con signInWithPassword (cliente aparte, sin tocar la sesión).
  const wrong = await verifyPassword(email, parsed.data.current);
  if (wrong) {
    if (wrong.code === "invalid_credentials" || /invalid login credentials/i.test(wrong.message)) {
      return fail(WRONG_CURRENT, { current: WRONG_CURRENT });
    }
    return fail(humanizeError(wrong, "verificar contraseña actual"));
  }

  // 2. Solo entonces se cambia, con la sesión del propio usuario.
  const { error } = await auth.supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(humanizeError(error, "cambiar contraseña"));

  return ok("Su contraseña se cambió. La próxima vez entre con la nueva.");
}

const nameSchema = z.object({
  name: z.string().trim().min(2, "Escriba su nombre.").max(120, "Use máximo 120 caracteres."),
});

export async function changeOwnName(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireAdmin();
  if (!auth.ok) return fail(ACCESS_MESSAGES[auth.reason]);

  const parsed = nameSchema.safeParse({ name: String(formData.get("name") ?? "") });
  if (!parsed.success) return fail(VALIDATION_MESSAGE, fieldErrors(parsed.error));

  const { data, error } = await updateOwnAdminName(auth, parsed.data.name);
  if (error) return fail(humanizeError(error, "cambiar nombre"));
  if (!data?.length) return fail(ACCESS_MESSAGES["no-admin"]);

  refresh();
  return ok("Se guardó su nombre.");
}
