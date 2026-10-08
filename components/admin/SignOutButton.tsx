"use client";

import { Loader2, LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

import { cn } from "@/components/ui/cn";

/** Botón «Cerrar sesión» (dentro de un <form action={signOut}>), con estado de carga. */
export function SignOutButton({
  label = "Cerrar sesión",
  variant = "quiet",
}: {
  label?: string;
  /** quiet: en la barra superior · primary: botón grande morado. */
  variant?: "quiet" | "primary";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-2 font-semibold transition disabled:opacity-60",
        variant === "quiet"
          ? "min-h-12 rounded-xl px-3 text-base text-ink-muted hover:bg-neutral-bg hover:text-ink"
          : "min-h-14 rounded-full bg-brand-purple px-6 text-lg text-white hover:bg-brand-purple-dark",
      )}
    >
      {pending ? (
        <Loader2 aria-hidden="true" className="size-5 animate-spin" />
      ) : (
        <LogOut aria-hidden="true" className="size-5" />
      )}
      {pending ? "Cerrando…" : label}
    </button>
  );
}
