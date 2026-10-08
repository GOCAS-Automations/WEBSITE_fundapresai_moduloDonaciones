/**
 * Markdown del sitio, SIN HTML crudo (plan §12): react-markdown ignora el
 * HTML del texto y solo se permiten las etiquetas de abajo. Lo usan la
 * landing («Quiénes somos»), el detalle de campaña y la privacidad, y la
 * vista previa del panel: así Angela ve exactamente lo que se publicará.
 *
 * - full: campañas y privacidad (títulos, listas, citas).
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
  full: cn(
    "space-y-5 text-lg leading-[1.7] text-ink [&_strong]:font-semibold [&_em]:italic",
    "[&_h2]:pt-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-[-0.01em] [&_h2]:text-ink",
    "[&_h3]:pt-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-ink",
    "[&_blockquote]:border-l-4 [&_blockquote]:border-brand-pink [&_blockquote]:pl-4 [&_blockquote]:text-ink-muted",
    "[&_hr]:border-separator",
    LIST_CLASSES,
  ),
  inline: cn("space-y-5 text-ink-muted [&_strong]:font-semibold [&_strong]:text-ink [&_em]:italic", LIST_CLASSES),
} as const;

const components: Components = {
  // Un solo h1 por página: los «#» del texto se muestran como h2.
  h1: ({ children }) => <h2>{children}</h2>,
  h4: ({ children }) => <h3>{children}</h3>,
  a: ({ href, children }) => (
    <a href={href} className="font-medium text-brand-purple underline underline-offset-4">
      {children}
    </a>
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
        components={components}
      >
        {children}
      </Markdown>
    </div>
  );
}
