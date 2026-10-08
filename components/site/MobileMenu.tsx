"use client";

import { ChevronRight, ExternalLink, Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { buttonClasses } from "@/components/ui/Button";
import type { SchoolSite } from "@/lib/links";
import { HELP_NAV, MAIN_NAV } from "./nav";
import { SectionLink } from "./SectionLinks";

/**
 * Menú del celular: botón con TEXTO («Menú» / «Cerrar»), no solo un ícono
 * (plan §5.1). Se cierra con Escape, al tocar fuera o al elegir un enlace.
 * Al final, «Sitio del colegio» (misma pestaña) si el panel tiene la dirección.
 */
export function MobileMenu({ school }: { school: SchoolSite | null }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const links = [...MAIN_NAV, HELP_NAV];

  return (
    <div ref={rootRef} className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={buttonClasses({ variant: "tinted", size: "compact" })}
      >
        <span aria-hidden="true" className="inline-flex shrink-0 max-[399px]:hidden [&>svg]:size-6">
          {open ? <X /> : <Menu />}
        </span>
        <span>{open ? "Cerrar" : "Menú"}</span>
      </button>

      <div id={panelId} hidden={!open} className="absolute inset-x-0 top-full px-3 pt-2 sm:px-5">
        <nav
          aria-label="Menú principal"
          className="mx-auto max-w-xl rounded-[var(--radius-card)] bg-white p-2 shadow-lifted ring-1 ring-black/[0.06]"
        >
          <ul className="divide-y divide-separator/70">
            {links.map((link) => (
              <li key={link.section}>
                <SectionLink
                  section={link.section}
                  onClick={() => setOpen(false)}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-2xl px-4 py-3 text-lg font-medium text-ink transition-colors hover:bg-brand-purple-soft hover:text-brand-purple"
                >
                  {link.label}
                  <ChevronRight aria-hidden="true" className="size-6 shrink-0 text-brand-purple" />
                </SectionLink>
              </li>
            ))}
            {school && (
              <li>
                <a
                  href={school.href}
                  rel="noopener"
                  className="flex min-h-14 items-center justify-between gap-3 rounded-2xl px-4 py-3 text-lg font-medium text-ink transition-colors hover:bg-brand-purple-soft hover:text-brand-purple"
                >
                  <span>
                    Sitio del colegio
                    <span className="sr-only"> (sale de este sitio)</span>
                  </span>
                  <ExternalLink aria-hidden="true" className="size-6 shrink-0 text-brand-purple" />
                </a>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </div>
  );
}
