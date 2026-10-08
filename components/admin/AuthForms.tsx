"use client";

import { KeyRound, LogIn, Mail } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { signIn, updatePassword } from "@/app/admin/actions";
import type { ActionState } from "@/lib/admin/action-state";
import { PASSWORD_HINT } from "@/lib/admin/password";
import { humanizeError } from "@/lib/admin/errors";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Notice } from "./ui";
import { describedBy, FieldShell, FormMessage, inputClasses, SubmitButton, TextField, useAdminForm } from "./form";
import { PasswordField } from "./PasswordField";

/** La ruta de regreso (?next=) se lee al enviar: así la página de login es estática. */
function signInWithNext(prev: ActionState, formData: FormData) {
  formData.set("next", new URLSearchParams(window.location.search).get("next") ?? "");
  return signIn(prev, formData);
}

/**
 * Formulario de entrada. Sin SMTP no hay «¿Olvidó su contraseña?» por correo:
 * el administrador general la restablece desde el panel. Con
 * PASSWORD_RECOVERY_ENABLED=true vuelve el enlace a /admin/recuperar.
 */
export function LoginForm({ recoveryEnabled = false }: { recoveryEnabled?: boolean }) {
  const { state, fieldErrors, pending, formRef, onSubmit } = useAdminForm(signInWithNext);
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-6">
      <TextField
        label="Correo"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        error={fieldErrors.email}
      />
      <PasswordField label="Contraseña" name="password" autoComplete="current-password" error={fieldErrors.password} />
      <SubmitButton pending={pending} pendingLabel="Entrando…" icon={<LogIn />} className="sm:w-full">
        Entrar
      </SubmitButton>
      <FormMessage state={state} />
      {recoveryEnabled ? (
        <p className="text-center">
          <Link
            href="/admin/recuperar"
            className="inline-flex min-h-12 items-center rounded-xl px-3 text-lg font-medium text-brand-purple underline underline-offset-4 hover:bg-brand-purple-soft"
          >
            ¿Olvidó su contraseña?
          </Link>
        </p>
      ) : (
        <p className="rounded-2xl bg-surface-muted px-4 py-3 text-center text-base text-ink-muted">
          ¿Olvidó su contraseña? Pídale al administrador general que se la restablezca.
        </p>
      )}
    </form>
  );
}

/** «Cerró sesión correctamente» tras ?salio=1 (va dentro de <Suspense>). */
export function SignedOutNotice() {
  const params = useSearchParams();
  if (!params.get("salio")) return null;
  return (
    <Notice tone="success" className="mb-6">
      Cerró sesión correctamente. ¡Hasta pronto!
    </Notice>
  );
}

/**
 * Pide el correo de recuperación desde el NAVEGADOR: así @supabase/ssr guarda
 * el «code verifier» (PKCE) en una cookie y /auth/confirm puede canjear el
 * código del enlace. Siempre muestra el mismo mensaje, exista o no la cuenta.
 */
export function RecoverForm() {
  const id = useId();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string; at: number } | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Escriba su correo completo. Ejemplo: nombre@dominio.org");
      document.getElementById(id)?.focus();
      return;
    }
    setError(undefined);
    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(value, {
        redirectTo: `${window.location.origin}/auth/confirm?next=/admin/restablecer`,
      });
      if (resetError) throw resetError;
      setMessage({
        tone: "success",
        text: "Si ese correo tiene una cuenta, en unos minutos le llegará un enlace para crear una nueva contraseña. Revise también la carpeta de correo no deseado. Abra el enlace en este mismo navegador.",
        at: Date.now(),
      });
    } catch (err) {
      setMessage({ tone: "error", text: humanizeError(err, "recuperar contraseña"), at: Date.now() });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FieldShell id={id} label="Correo" error={error}>
        <input
          id={id}
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-required
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, { error })}
          className={inputClasses}
        />
      </FieldShell>
      <SubmitButton pending={pending} pendingLabel="Enviando…" icon={<Mail />} className="sm:w-full">
        Enviarme el enlace
      </SubmitButton>
      <FormMessage
        state={message ? { status: message.tone, message: message.text, at: message.at } : { status: "idle", message: "" }}
      />
      <p className="text-center">
        <Link
          href="/admin/login"
          className="inline-flex min-h-12 items-center rounded-xl px-3 text-lg font-medium text-brand-purple underline underline-offset-4 hover:bg-brand-purple-soft"
        >
          Volver a entrar
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const { state, fieldErrors, pending, formRef, onSubmit } = useAdminForm(updatePassword);
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-6">
      <PasswordField
        label="Nueva contraseña"
        name="password"
        autoComplete="new-password"
        hint={PASSWORD_HINT}
        error={fieldErrors.password}
      />
      <PasswordField label="Repita la nueva contraseña" name="confirm" autoComplete="new-password" error={fieldErrors.confirm} />
      <SubmitButton pending={pending} icon={<KeyRound />} className="sm:w-full">
        Guardar contraseña
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

