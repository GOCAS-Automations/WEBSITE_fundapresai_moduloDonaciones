import type { ReactNode } from "react";

import { cn } from "./cn";

/** Etiqueta corta de campaña: morado oscuro sobre rosa (7,5:1). */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-brand-pink px-3.5 py-1 text-sm font-medium text-brand-purple-dark",
        className,
      )}
    >
      {children}
    </span>
  );
}
