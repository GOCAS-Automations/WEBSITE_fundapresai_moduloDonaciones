"use client";

/**
 * Formularios del panel: campos grandes con etiqueta, ayuda, error y
 * contador; botón Guardar con estado de carga; mensaje accesible (aria-live).
 *
 * Los formularios se envían con onSubmit + startTransition (no con
 * <form action>): así React no vacía los campos después de guardar.
 */
import { Loader2 } from "lucide-react";
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type FormEvent,
  type ReactNode,
} from "react";

import { Notice } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { IDLE, type ActionState } from "@/lib/admin/action-state";

// -----------------------------------------------------------------------------
// Hook del formulario
// -----------------------------------------------------------------------------

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** Mensaje si algo del formulario aún no está listo (imagen subiendo o enlace sin comprobar). */
function blockingMessage(form: HTMLFormElement): { message: string; el: HTMLElement } | null {
  const el = form.querySelector<HTMLElement>("[data-blocking]");
  if (!el) return null;
  return { message: el.dataset.blocking ?? "Espere un momento: hay algo pendiente en el formulario.", el };
}

export function useAdminForm(action: FormAction) {
  const [state, dispatch, pending] = useActionState(action, IDLE);
  const [localError, setLocalError] = useState<ActionState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const blocking = blockingMessage(form);
    if (blocking) {
      setLocalError({ status: "error", message: blocking.message, at: Date.now() });
      blocking.el.querySelector<HTMLElement>("input:not([type=hidden]), button")?.focus();
      return;
    }
    setLocalError(null);
    const formData = new FormData(form);
    startTransition(() => dispatch(formData));
  };

  // Tras un error de validación, el foco va al primer campo marcado.
  useEffect(() => {
    if (state.status !== "error" || !state.fieldErrors) return;
    const first = Object.keys(state.fieldErrors)[0];
    if (!first || !formRef.current) return;
    const selector = `[name="${CSS.escape(first)}"]:not([type=hidden]), [data-field="${CSS.escape(first)}"]`;
    formRef.current.querySelector<HTMLElement>(selector)?.focus();
  }, [state]);

  const shown = localError ?? state;
  return { state: shown, fieldErrors: localError ? {} : (state.fieldErrors ?? {}), pending, formRef, onSubmit };
}

// -----------------------------------------------------------------------------
// Mensaje del formulario
// -----------------------------------------------------------------------------

/** Región aria-live siempre presente: anuncia «Guardado» o el error. */
export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className={className}>
      {state.status !== "idle" && state.message && (
        <Notice key={state.at} tone={state.status === "success" ? "success" : "error"}>
          {state.message}
        </Notice>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Botón Guardar
// -----------------------------------------------------------------------------

export function SubmitButton({
  pending,
  children = "Guardar",
  pendingLabel = "Guardando…",
  icon,
  className,
}: {
  pending: boolean;
  children?: ReactNode;
  pendingLabel?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      aria-disabled={pending}
      icon={pending ? <Loader2 className="animate-spin" /> : icon}
      className={cn("w-full sm:w-auto sm:min-w-44", className)}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** Pie de cada bloque: botón + mensaje. */
export function FormFooter({ state, pending, label = "Guardar" }: { state: ActionState; pending: boolean; label?: string }) {
  return (
    <div className="mt-6 space-y-4 border-t border-separator pt-5">
      <SubmitButton pending={pending}>{label}</SubmitButton>
      <FormMessage state={state} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Campos
// -----------------------------------------------------------------------------

export const inputClasses =
  "block w-full min-h-14 rounded-2xl border-2 border-separator bg-surface px-4 py-3 text-lg text-ink " +
  "placeholder:text-ink-muted transition-colors hover:border-[#cfc8d6] focus-visible:border-brand-purple " +
  "aria-[invalid=true]:border-danger-ink aria-[invalid=true]:bg-danger-bg/30";

type FieldShellProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  counter?: { length: number; max: number };
  children: ReactNode;
  className?: string;
};

/** Etiqueta + control + ayuda + error + contador, con los ids conectados. */
export function FieldShell({ id, label, hint, error, optional, counter, children, className }: FieldShellProps) {
  const over = counter && counter.length > counter.max;
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label htmlFor={id} className="text-lg font-semibold text-ink">
          {label}
          {optional && <span className="ml-2 text-base font-normal text-ink-muted">(opcional)</span>}
        </label>
        {counter && (
          <span
            id={`${id}-contador`}
            className={cn("shrink-0 text-base tabular-nums", over ? "font-semibold text-danger-ink" : "text-ink-muted")}
          >
            {counter.length} / {counter.max}
            <span className="sr-only"> caracteres</span>
          </span>
        )}
      </div>
      {hint && (
        <p id={`${id}-ayuda`} className="text-base text-ink-muted">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="text-base font-medium text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}

export function describedBy(id: string, { hint, error, counter }: { hint?: unknown; error?: unknown; counter?: unknown }) {
  return [hint && `${id}-ayuda`, counter && `${id}-contador`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
}

type TextFieldProps = {
  label: ReactNode;
  name: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  /** Muestra el contador «n / max» (no corta el texto: avisa). */
  max?: number;
  multiline?: boolean;
  rows?: number;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"input">, "name" | "className" | "max"> &
  Pick<ComponentPropsWithoutRef<"textarea">, "rows">;

/** Campo de texto (o área de texto) no controlado, con contador opcional. */
export function TextField({
  label,
  name,
  hint,
  error,
  optional,
  max,
  multiline,
  rows = 3,
  className,
  defaultValue,
  onChange,
  value,
  ...rest
}: TextFieldProps) {
  const id = useId();
  const initial = String(value ?? defaultValue ?? "");
  const [length, setLength] = useState(initial.length);
  const counter = max ? { length: value !== undefined ? String(value).length : length, max } : undefined;
  const common = {
    id,
    name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy(id, { hint, error, counter }),
    "aria-required": optional ? undefined : true,
    // field-sizing: el área de texto crece con el contenido (Chrome/Edge; Safari usa rows).
    className: cn(inputClasses, multiline && "min-h-28 max-h-[70vh] resize-y leading-relaxed [field-sizing:content]"),
  };

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} counter={counter} className={className}>
      {multiline ? (
        <textarea
          {...common}
          rows={rows}
          {...(value !== undefined ? { value: String(value) } : { defaultValue: initial })}
          onChange={(e) => {
            setLength(e.target.value.length);
            onChange?.(e as never);
          }}
          placeholder={rest.placeholder}
          disabled={rest.disabled}
        />
      ) : (
        <input
          {...rest}
          {...common}
          {...(value !== undefined ? { value } : { defaultValue: initial })}
          onChange={(e) => {
            setLength(e.target.value.length);
            onChange?.(e);
          }}
        />
      )}
    </FieldShell>
  );
}
