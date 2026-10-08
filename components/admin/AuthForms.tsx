"use client";

import { Eye, EyeOff, KeyRound, LogIn, Mail } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";

import { signIn, updatePassword } from "@/app/admin/actions";
import { cn } from "@/components/ui/cn";
import type { ActionState } from "@/lib/admin/action-state";
import { humanizeError } from "@/lib/admin/errors";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Notice } from "./ui";
import { describedBy, FieldShell, FormMessage, inputClasses, SubmitButton, TextField, useAdminForm } from "./form";

/** Contraseña con botón «Mostrar» (con texto, 48 px). */
function PasswordField({
  label,
  name,
  autoComplete,
  error,
  hint,
}: {
  label: string;
  name: string;
  autoComplete: string;
  error?: string;
  hint?: ReactNode;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          aria-required
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, { hint, error })}
          className={cn(inputClasses, "pr-32")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          className="absolute inset-y-1 right-1 inline-flex min-h-12 items-center gap-1.5 rounded-xl px-3 text-base font-semibold text-brand-purple hover:bg-brand-purple-soft"
        >
          {visible ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
          {visible ? "Ocultar" : "Mostrar"}
          <span className="sr-only"> contraseña</span>
        </button>
      </div>
    </FieldShell>
  );
}

/** La ruta de regreso (?next=) se lee al enviar: así la página de login es estática. */
function signInWithNext(prev: ActionState, formData: FormData) {
  formData.set("next", new URLSearchParams(window.location.search).get("next") ?? "");
  return signIn(prev, formData);
}

export function LoginForm() {
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
      <p className="text-center">
        <Link
          href="/admin/recuperar"
          className="inline-flex min-h-12 items-center rounded-xl px-3 text-lg font-medium text-brand-purple underline underline-offset-4 hover:bg-brand-purple-soft"
        >
          ¿Olvidó su contraseña?
        </Link>
      </p>
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
        hint="Al menos 8 caracteres, con letras y números."
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

