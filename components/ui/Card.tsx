import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./cn";

/** Superficie blanca estilo iOS: esquinas de 24 px, sombra suave y borde fino. */
export function Card({ className, ...rest }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-separator/70 bg-surface shadow-soft",
        className,
      )}
      {...rest}
    />
  );
}
