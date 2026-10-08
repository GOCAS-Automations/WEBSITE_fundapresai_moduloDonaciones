import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "./cn";

/**
 * Enlace «‹ Volver» grande y con texto (plan §5.2): píldora blanca de 48 px
 * de alto, como el botón «atrás» de iOS.
 */
export function BackLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex min-h-12 items-center gap-1 rounded-full bg-white/85 py-2 pl-2.5 pr-5 text-lg font-medium text-brand-purple shadow-soft ring-1 ring-black/[0.05] backdrop-blur transition-colors hover:bg-white hover:text-brand-purple-dark",
        className,
      )}
    >
      <ChevronLeft aria-hidden="true" className="size-6 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
      {children}
    </Link>
  );
}
