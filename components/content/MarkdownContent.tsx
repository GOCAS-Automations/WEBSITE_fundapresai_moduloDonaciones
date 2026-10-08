/**
 * Markdown del sitio, SIN HTML crudo (plan §12): react-markdown ignora el
 * HTML del texto y solo se permiten las etiquetas de abajo. Lo usan la
 * landing («Quiénes somos»), el detalle de campaña y la privacidad, y la
 * vista previa del panel: así Angela ve exactamente lo que se publicará.
 *
 * - full: campañas y privacidad. Tipografía de lectura (clase .md-reading en
 *   globals.css): párrafos de 20 px con interlineado amplio, h2 y h3
 *   jerarquizados, listas con el símbolo de la marca en vez de viñetas y
 *   listas numeradas con círculos.
 * - inline: «Quiénes somos» (párrafos, negritas, listas y enlaces).
 */
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/components/ui/cn";

const FULL_ELEMENTS = ["h1", "h2", "h3", "h4", "p", "strong", "em", "del", "ul", "ol", "li", "a", "blockquote", "hr", "br"];
const INLINE_ELEMENTS = ["p", "strong", "em", "ul", "ol", "li", "a"];

const LIST_CLASSES =
  "[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_li]:pl-1 [&_li::marker]:text-brand-purple";

const VARIANT_CLASSES = {
  full: "md-reading",
  inline: cn("space-y-5 text-ink-muted [&_strong]:font-semibold [&_strong]:text-ink [&_em]:italic", LIST_CLASSES),
} as const;

const shared: Components = {
  // Un solo h1 por página: los «#» del texto se muestran como h2.
  h1: ({ children }) => <h2>{children}</h2>,
  h4: ({ children }) => <h3>{children}</h3>,
  a: ({ href, children }) => (
    <a
      href={href}
      rel={href?.startsWith("http") ? "noopener" : undefined}
      className="font-medium text-brand-purple underline decoration-2 underline-offset-4 hover:text-brand-purple-dark"
    >
      {children}
    </a>
  ),
};

const fullComponents: Components = {
  ...shared,
  // Cada ítem lleva el símbolo de la marca como viñeta (decorativo, dibujado
  // en CSS: .md-marker). En las listas numeradas el número va en un círculo.
  li: ({ children }) => (
    <li>
      <span aria-hidden="true" className="md-marker" />
      {children}
    </li>
  ),
};

type MarkdownContentProps = {
  children: string;
  variant?: keyof typeof VARIANT_CLASSES;
  className?: string;
};

export function MarkdownContent({ children, variant = "full", className }: MarkdownContentProps) {
  return (
    <div className={cn(VARIANT_CLASSES[variant], className)}>
      <Markdown
        remarkPlugins={variant === "full" ? [remarkGfm] : []}
        allowedElements={variant === "full" ? FULL_ELEMENTS : INLINE_ELEMENTS}
        unwrapDisallowed
        skipHtml
        components={variant === "full" ? fullComponents : shared}
      >
        {children}
      </Markdown>
    </div>
  );
}
