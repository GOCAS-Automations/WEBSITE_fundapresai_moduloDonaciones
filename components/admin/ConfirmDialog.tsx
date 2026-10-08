"use client";

/**
 * Modal de confirmación propio (nunca window.confirm): <dialog> nativo con
 * showModal() (el resto de la página queda inerte), aria-modal, foco
 * atrapado con Tab, Esc para cancelar y el foco vuelve al botón que lo abrió.
 */
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel = "Un momento…",
  cancelLabel = "Cancelar",
  pending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      // Foco inicial en «Cancelar»: la opción segura.
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      const back = opener.current;
      if (back && document.contains(back)) back.focus();
    }
  }, [open]);

  const trapFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") return;
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <dialog
      ref={ref}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(event) => {
        // Esc: lo maneja React para que el estado quede sincronizado.
        event.preventDefault();
        if (!pending) onClose();
      }}
      onKeyDown={trapFocus}
      onClick={(event) => {
        // Toque fuera de la tarjeta (en el fondo oscuro) = cancelar.
        if (event.target === ref.current && !pending) onClose();
      }}
      className="m-auto w-[min(34rem,calc(100%-2rem))] max-w-none rounded-[1.75rem] bg-surface p-0 text-ink shadow-lifted backdrop:bg-[rgb(43_34_51/0.55)] backdrop:backdrop-blur-sm"
    >
      <div className="p-6 sm:p-8">
        <span aria-hidden="true" className="grid size-14 place-items-center rounded-2xl bg-danger-bg text-danger-ink">
          <AlertTriangle className="size-7" />
        </span>
        <h2 id={titleId} className="mt-5 text-2xl leading-snug">
          {title}
        </h2>
        <div id={descId} className="mt-3 text-lg text-ink-muted">
          {description}
        </div>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="secondary" size="lg" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant="danger"
            size="lg"
            onClick={onConfirm}
            disabled={pending}
            icon={pending ? <Loader2 className="animate-spin" /> : undefined}
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
