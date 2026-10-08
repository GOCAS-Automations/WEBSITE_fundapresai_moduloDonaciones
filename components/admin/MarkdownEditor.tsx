"use client";

/**
 * Editor Markdown sencillo: área de texto con una barra mínima (negrita,
 * lista, título) y una pestaña «Vista previa» que usa el MISMO componente que
 * el sitio público (sin HTML crudo).
 */
import { Bold, Eye, Heading2, List, PenLine } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { MarkdownContent } from "@/components/content/MarkdownContent";
import { cn } from "@/components/ui/cn";
import { describedBy, FieldShell, inputClasses } from "./form";

type MarkdownEditorProps = {
  label: string;
  name: string;
  defaultValue?: string;
  hint?: ReactNode;
  error?: string;
  max?: number;
  optional?: boolean;
  rows?: number;
  /** Igual que donde se publica: «full» (campañas, privacidad) o «inline» (Quiénes somos). */
  variant?: "full" | "inline";
};

type Tab = "escribir" | "vista";

const toolButton =
  "inline-flex min-h-12 items-center gap-2 rounded-xl px-3.5 text-base font-semibold text-brand-purple " +
  "hover:bg-brand-purple-soft active:scale-[0.97] transition";

export function MarkdownEditor({
  label,
  name,
  defaultValue = "",
  hint,
  error,
  max,
  optional,
  rows = 12,
  variant = "full",
}: MarkdownEditorProps) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<Tab>("escribir");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const escribirTabRef = useRef<HTMLButtonElement>(null);
  const vistaTabRef = useRef<HTMLButtonElement>(null);
  const counter = max ? { length: value.length, max } : undefined;

  /** Aplica un cambio sobre la selección y deja el cursor en su sitio. */
  function edit(transform: (text: string, start: number, end: number) => { text: string; start: number; end: number }) {
    const el = textareaRef.current;
    if (!el) return;
    const result = transform(el.value, el.selectionStart, el.selectionEnd);
    setValue(result.text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.start, result.end);
    });
  }

  const bold = () =>
    edit((text, start, end) => {
      const selected = text.slice(start, end) || "texto en negrita";
      const next = `${text.slice(0, start)}**${selected}**${text.slice(end)}`;
      return { text: next, start: start + 2, end: start + 2 + selected.length };
    });

  /** Antepone (o quita) un prefijo a cada línea seleccionada. */
  const prefixLines = (prefix: string, pattern: RegExp) =>
    edit((text, start, end) => {
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      const lineEndIdx = text.indexOf("\n", end);
      const lineEnd = lineEndIdx === -1 ? text.length : lineEndIdx;
      const lines = text.slice(lineStart, lineEnd).split("\n");
      const allHave = lines.every((l) => pattern.test(l));
      const changed = lines.map((l) => (allHave ? l.replace(pattern, "") : `${prefix}${l.replace(pattern, "")}`)).join("\n");
      const next = text.slice(0, lineStart) + changed + text.slice(lineEnd);
      return { text: next, start: lineStart, end: lineStart + changed.length };
    });

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: Tab = tab === "escribir" ? "vista" : "escribir";
    setTab(next);
    (next === "escribir" ? escribirTabRef : vistaTabRef).current?.focus();
  };

  const tabClass = (active: boolean) =>
    cn(
      "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition sm:flex-none sm:px-4 sm:text-base",
      active ? "bg-surface text-brand-purple shadow-soft" : "text-ink-muted hover:text-ink",
    );

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} counter={counter}>
      <div className="overflow-hidden rounded-2xl border-2 border-separator bg-surface-muted">
        <div className="flex flex-wrap items-center justify-between gap-2 p-1.5">
          <div role="tablist" aria-label={`${label}: escribir o ver cómo queda`} className="flex w-full gap-1 rounded-2xl bg-neutral-bg p-1 sm:w-auto">
            <button
              ref={escribirTabRef}
              type="button"
              role="tab"
              id={`${id}-tab-escribir`}
              aria-selected={tab === "escribir"}
              aria-controls={`${id}-panel-escribir`}
              tabIndex={tab === "escribir" ? 0 : -1}
              onClick={() => setTab("escribir")}
              onKeyDown={onTabKey}
              className={tabClass(tab === "escribir")}
            >
              <PenLine aria-hidden="true" className="hidden size-5 sm:block" />
              Escribir
            </button>
            <button
              ref={vistaTabRef}
              type="button"
              role="tab"
              id={`${id}-tab-vista`}
              aria-selected={tab === "vista"}
              aria-controls={`${id}-panel-vista`}
              tabIndex={tab === "vista" ? 0 : -1}
              onClick={() => setTab("vista")}
              onKeyDown={onTabKey}
              className={tabClass(tab === "vista")}
            >
              <Eye aria-hidden="true" className="hidden size-5 sm:block" />
              Vista previa
            </button>
          </div>
          {tab === "escribir" && (
            <div role="toolbar" aria-label="Formato del texto" aria-controls={id} className="flex flex-wrap gap-1">
              <button type="button" className={toolButton} onClick={bold}>
                <Bold aria-hidden="true" className="size-5" />
                Negrita
              </button>
              <button type="button" className={toolButton} onClick={() => prefixLines("- ", /^\s*[-*]\s+/)}>
                <List aria-hidden="true" className="size-5" />
                Lista
              </button>
              {variant === "full" && (
                <button type="button" className={toolButton} onClick={() => prefixLines("## ", /^#{1,4}\s+/)}>
                  <Heading2 aria-hidden="true" className="size-5" />
                  Título
                </button>
              )}
            </div>
          )}
        </div>

        <div id={`${id}-panel-escribir`} role="tabpanel" aria-labelledby={`${id}-tab-escribir`} hidden={tab !== "escribir"}>
          <textarea
            ref={textareaRef}
            id={id}
            name={name}
            rows={rows}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(id, { hint, error, counter })}
            aria-required={optional ? undefined : true}
            className={cn(
              inputClasses,
              "min-h-64 resize-y rounded-none rounded-b-2xl border-0 border-t-2 leading-relaxed focus-visible:border-brand-purple",
            )}
          />
        </div>
        <div
          id={`${id}-panel-vista`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-vista`}
          hidden={tab !== "vista"}
          tabIndex={0}
          className="min-h-64 border-t-2 border-separator bg-surface p-5"
        >
          {value.trim() ? (
            <MarkdownContent variant={variant}>{value}</MarkdownContent>
          ) : (
            <p className="text-ink-muted">Aún no hay texto para mostrar.</p>
          )}
        </div>
      </div>
      <p className="text-base text-ink-muted">
        Consejo: <strong className="font-semibold text-ink">**dos asteriscos**</strong> ponen negrita; un guion
        «-» al inicio de la línea arma una lista
        {variant === "full" && <>; «##» al inicio la vuelve título</>}. Deje una línea en blanco entre párrafos.
      </p>
    </FieldShell>
  );
}
