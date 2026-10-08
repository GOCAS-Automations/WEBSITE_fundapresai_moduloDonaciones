"use server";

/** Server Actions de acceso: entrar, salir y definir una nueva contraseña. */
import { redirect } from "next/navigation";
import { z } from "zod";

import { fail, type ActionState } from "@/lib/admin/action-state";
import { humanizeError } from "@/lib/admin/errors";
import { newPasswordSchema } from "@/lib/admin/password";
import { isPasswordRecoveryEnabled } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validations";

/** Solo rutas internas del panel (evita redirecciones abiertas). */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return /^\/admin(\/[a-z0-9\-/]*)?$/.test(next) && !next.startsWith("/admin/login") ? next : "/admin";
}

const loginSchema = z.object({
  email: z.email("Escriba su correo completo. Ejemplo: nombre@dominio.org"),
  password: z.string().min(1, "Escriba su contraseña."),
});

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return fail("Revise los datos marcados en rojo.", fieldErrors(parsed.error));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return fail(humanizeError(error, "login"));

  redirect(safeNext(formData.get("next")));
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login?salio=1");
}

const passwordSchema = z
  .object({
    password: newPasswordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Las dos contraseñas no coinciden." });

/** Nueva contraseña desde el enlace de recuperación (solo con PASSWORD_RECOVERY_ENABLED=true). */
export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isPasswordRecoveryEnabled()) {
    return fail("La recuperación por correo está desactivada. Pídale al administrador general que le restablezca la contraseña.");
  }
  const parsed = passwordSchema.safeParse({
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) return fail("Revise los datos marcados en rojo.", fieldErrors(parsed.error));

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail("El enlace para cambiar la contraseña ya venció. Pida uno nuevo en «¿Olvidó su contraseña?».");
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(humanizeError(error, "cambiar contraseña"));

  redirect("/admin?aviso=clave");
}
