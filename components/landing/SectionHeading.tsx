import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

type SectionHeadingProps = {
  id: string;
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  align?: "start" | "center";
  className?: string;
};

/** Encabezado de sección: antetítulo pequeño, título grande (h2) y bajada opcional. */
export function SectionHeading({ id, eyebrow, title, children, align = "start", className }: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p className="text-base font-semibold tracking-wide text-brand-purple">{eyebrow}</p>
      )}
      <h2 id={id} className="mt-2 text-3xl tracking-[-0.02em] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
        {title}
      </h2>
      {children && <div className="mt-4 text-lg text-ink-muted">{children}</div>}
    </div>
  );
}
