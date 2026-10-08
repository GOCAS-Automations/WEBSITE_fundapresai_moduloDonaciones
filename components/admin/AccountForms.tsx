"use client";

/** «Mi cuenta»: cambiar el nombre propio y la contraseña (pidiendo la actual). */
import { KeyRound } from "lucide-react";

import { changeOwnName, changeOwnPassword } from "@/app/admin/(panel)/cuenta/actions";
import { PASSWORD_HINT } from "@/lib/admin/password";
import { FormFooter, FormMessage, SubmitButton, TextField, useAdminForm } from "./form";
import { PasswordField } from "./PasswordField";

export function OwnNameForm({ name }: { name: string }) {
  const { state, fieldErrors, pending, formRef, onSubmit } = useAdminForm(changeOwnName);
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate>
      <TextField
        label="Su nombre"
        name="name"
        defaultValue={name}
        max={120}
        autoComplete="name"
        hint="Se usa en el saludo del panel."
        error={fieldErrors.name}
      />
      <FormFooter state={state} pending={pending} label="Guardar nombre" />
    </form>
  );
}

export function OwnPasswordForm() {
  const { state, fieldErrors, pending, formRef, onSubmit } = useAdminForm(changeOwnPassword);
  // Tras cambiarla, los campos se vacían (se vuelven a montar) y el aviso queda visible.
  const formKey = state.status === "success" ? state.at : "campos";

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate>
      <div key={formKey} className="space-y-6">
        <PasswordField
          label="Contraseña actual"
          name="current"
          autoComplete="current-password"
          error={fieldErrors.current}
        />
        <PasswordField
          label="Nueva contraseña"
          name="password"
          autoComplete="new-password"
          hint={PASSWORD_HINT}
          error={fieldErrors.password}
        />
        <PasswordField
          label="Repita la nueva contraseña"
          name="confirm"
          autoComplete="new-password"
          error={fieldErrors.confirm}
        />
      </div>
      <div className="mt-6 space-y-4 border-t border-separator pt-5">
        <SubmitButton pending={pending} pendingLabel="Cambiando…" icon={<KeyRound />}>
          Cambiar contraseña
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
