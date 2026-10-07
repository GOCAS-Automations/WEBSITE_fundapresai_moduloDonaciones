import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "./cn";

type Variant = "primary" | "secondary" | "quiet";
type Size = "md" | "lg";

type StyleProps = {
  variant?: Variant;
  /** lg = CTA de donar: 56 px de alto como mínimo (plan §6). md = 48 px. */
  size?: Size;
  fullWidth?: boolean;
  /** Ícono decorativo (lucide). El botón SIEMPRE lleva texto. */
  icon?: ReactNode;
  iconPosition?: "start" | "end";
};

const base =
  "inline-flex items-center justify-center gap-2.5 rounded-[var(--radius-button)] text-center font-semibold " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 select-none";

const variants: Record<Variant, string> = {
  // Blanco sobre morado: 9,6:1 (AAA). Hover más oscuro: 12,3:1.
  primary:
    "bg-brand-purple text-white shadow-soft hover:bg-brand-purple-dark hover:shadow-lifted",
  // Contorno morado sobre blanco: 9,6:1.
  secondary:
    "border-2 border-brand-purple bg-surface text-brand-purple hover:bg-brand-purple-soft",
  quiet: "text-brand-purple underline underline-offset-4 hover:bg-brand-purple-soft",
};

const sizes: Record<Size, string> = {
  md: "min-h-12 px-5 py-2.5 text-base",
  lg: "min-h-14 px-7 py-3 text-lg",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: Pick<StyleProps, "variant" | "size" | "fullWidth"> & { className?: string }) {
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);
}

function Content({ icon, iconPosition = "start", children }: Pick<StyleProps, "icon" | "iconPosition"> & { children: ReactNode }) {
  const iconEl = icon ? (
    <span aria-hidden="true" className="inline-flex shrink-0 [&>svg]:size-6">
      {icon}
    </span>
  ) : null;
  return (
    <>
      {iconPosition === "start" && iconEl}
      <span>{children}</span>
      {iconPosition === "end" && iconEl}
    </>
  );
}

type ButtonProps = StyleProps & ComponentPropsWithoutRef<"button">;

export function Button({
  variant,
  size,
  fullWidth,
  icon,
  iconPosition,
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      <Content icon={icon} iconPosition={iconPosition}>
        {children}
      </Content>
    </button>
  );
}

type ButtonLinkProps = StyleProps &
  Omit<ComponentPropsWithoutRef<"a">, "href"> & {
    href: string;
    /**
     * Enlace externo (p. ej. Donar Online). Se abre en la MISMA pestaña
     * (plan §5.3: el botón «atrás» devuelve al sitio) con rel="noopener".
     */
    external?: boolean;
  };

export function ButtonLink({
  variant,
  size,
  fullWidth,
  icon,
  iconPosition,
  className,
  href,
  external,
  children,
  ...rest
}: ButtonLinkProps) {
  const classes = buttonClasses({ variant, size, fullWidth, className });
  const content = (
    <Content icon={icon} iconPosition={iconPosition}>
      {children}
    </Content>
  );
  const isExternal = external ?? /^(https?:|mailto:|tel:)/.test(href);
  if (isExternal) {
    return (
      <a href={href} rel="noopener" className={classes} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...rest}>
      {content}
    </Link>
  );
}
