"use client";

/**
 * Campo de contraseña con botón «Mostrar» (texto, 48 px) y, opcionalmente,
 * «Generar contraseña segura» (al generarla, queda visible para copiarla).
 */
import { Check, Copy, Eye, EyeOff, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { generatePassword } from "@/lib/admin/password";
import { describedBy, FieldShell, inputClasses } from "./form";

type PasswordFieldProps = {
  label: string;
  name: string;
  autoComplete: string;
  error?: string;
  hint?: ReactNode;
  /** Muestra «Generar contraseña segura» debajo del campo. */
  canGenerate?: boolean;
};

export function PasswordField({ label, name, autoComplete, error, hint, canGenerate }: PasswordFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [visible, setVisible] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = () => {
    const input = inputRef.current;
    if (!input) return;
    input.value = generatePassword();
    setVisible(true);
    setGenerated(true);
    input.focus();
    input.select();
  };

  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-required
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, { hint, error })}
          onChange={() => setGenerated(false)}
          className={cn(inputClasses, "pr-32", visible && "font-mono tracking-wide")}
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
      {canGenerate && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          <Button type="button" variant="tinted" icon={<Sparkles />} onClick={generate}>
            Generar contraseña segura
          </Button>
          <p role="status" className="text-base text-ink-muted">
            {generated ? "Listo: se generó una contraseña de 16 caracteres." : ""}
          </p>
        </div>
      )}
    </FieldShell>
  );
}

/**
 * Contraseña recién creada o restablecida: se muestra UNA SOLA VEZ, con
 * «Copiar». Al tocar «Listo» desaparece y no hay forma de volver a verla.
 */
export function OneTimePassword({
  title,
  username,
  password,
  onDone,
}: {
  title: string;
  username: string;
  password: string;
  onDone: () => void;
}) {
  const headingId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState<"ok" | "manual" | null>(null);

  // Al aparecer, el foco va al aviso (lectores de pantalla lo leen completo).
  useEffect(() => ref.current?.focus(), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied("ok");
    } catch {
      // Sin permiso de portapapeles: se selecciona el texto para copiarlo a mano.
      const range = document.createRange();
      if (codeRef.current) range.selectNodeContents(codeRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      setCopied("manual");
    }
  };

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-labelledby={headingId}
      data-one-time-password
      className="rounded-2xl bg-success-bg p-5 text-ink outline-none ring-1 ring-success-ink/20 focus-visible:ring-2 focus-visible:ring-brand-purple sm:p-6"
    >
      <h3 id={headingId} className="text-xl text-success-ink">
        {title}
      </h3>
      <p className="mt-2 text-base">
        Copie la contraseña ahora y entréguela a la persona en privado (en persona o por un mensaje directo).{" "}
        <strong className="font-semibold">Por seguridad, no se volverá a mostrar.</strong>
      </p>
      <dl className="mt-4 space-y-3 text-base">
        <div>
          <dt className="text-ink-muted">Usuario para entrar</dt>
          <dd className="break-all font-semibold">{username}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Contraseña</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-3">
            <code
              ref={codeRef}
              data-password
              className="select-all break-all rounded-xl bg-surface px-4 py-2.5 font-mono text-xl tracking-wider text-ink ring-1 ring-black/[0.08]"
            >
              {password}
            </code>
            <Button type="button" variant="primary" icon={copied === "ok" ? <Check /> : <Copy />} onClick={copy}>
              {copied === "ok" ? "Copiada" : "Copiar"}
              <span className="sr-only"> contraseña</span>
            </Button>
          </dd>
        </div>
      </dl>
      <p role="status" className="mt-2 min-h-6 text-base">
        {copied === "ok"
          ? "Se copió la contraseña."
          : copied === "manual"
            ? "No se pudo copiar automáticamente: la contraseña quedó seleccionada, cópiela con Ctrl + C (o mantenga presionado en el celular)."
            : ""}
      </p>
      <p className="mt-2 text-base text-ink-muted">Pídale que la cambie en «Mi cuenta» la primera vez que entre.</p>
      <Button type="button" variant="secondary" className="mt-4" onClick={onDone}>
        Listo, ya la copié
      </Button>
    </div>
  );
}
