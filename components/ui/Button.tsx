import Link from "next/link";
import type { ComponentProps, ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "./cn";

type Variant = "primary" | "secondary" | "tinted" | "whatsapp" | "quiet" | "danger" | "dangerOutline";
type Size = "md" | "lg" | "xl" | "compact";

type StyleProps = {
  variant?: Variant;
  /**
   * md = 48 px · lg = 56 px (mínimo de los CTA de donar, plan §6) · xl = 60 px (CTA principal) ·
   * compact = 56 px de alto con menos relleno lateral (header en celulares angostos).
   */
  size?: Size;
  fullWidth?: boolean;
  /** Ícono decorativo (lucide). El botón SIEMPRE lleva texto. */
  icon?: ReactNode;
  iconPosition?: "start" | "end";
  /** Clases extra para el ícono (p. ej. ocultarlo en pantallas muy angostas). */
  iconClassName?: string;
};

const base =
  "inline-flex items-center justify-center gap-2.5 rounded-[var(--radius-button)] text-center font-semibold " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out " +
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60 select-none";

const variants: Record<Variant, string> = {
  // Blanco sobre morado: 9,6:1 (AAA). Hover más oscuro: 12,3:1.
  primary:
    "bg-brand-purple text-white shadow-[0_1px_2px_rgb(43_34_51/0.12),0_6px_16px_-4px_rgb(95_44_133/0.45)] " +
    "hover:bg-brand-purple-dark hover:shadow-[0_2px_4px_rgb(43_34_51/0.14),0_12px_28px_-6px_rgb(95_44_133/0.5)]",
  // Contorno morado sobre blanco: 9,6:1.
  secondary:
    "border-2 border-brand-purple bg-surface text-brand-purple hover:bg-brand-purple-soft",
  // Morado sobre morado suave: 8,5:1.
  tinted: "bg-brand-purple-soft text-brand-purple hover:bg-[#e9dff2]",
  // Blanco sobre verde WhatsApp oscuro: 7:1 (AAA).
  whatsapp:
    "bg-whatsapp text-white shadow-[0_1px_2px_rgb(43_34_51/0.12),0_6px_16px_-4px_rgb(10_102_64/0.45)] hover:bg-whatsapp-dark",
  quiet: "text-brand-purple underline underline-offset-4 hover:bg-brand-purple-soft",
  // Panel: blanco sobre rojo oscuro (7,5:1) y contorno rojo sobre blanco.
  danger: "bg-danger-ink text-white hover:bg-[#82180f]",
  dangerOutline: "border-2 border-danger-ink/35 bg-surface text-danger-ink hover:bg-danger-bg",
};

const sizes: Record<Size, string> = {
  md: "min-h-12 px-5 py-2.5 text-base",
  lg: "min-h-14 px-6 py-3 text-base",
  xl: "min-h-[3.75rem] px-6 py-3 text-base sm:px-8 sm:text-lg",
  compact: "min-h-14 px-4 py-3 text-base min-[400px]:px-5",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: Pick<StyleProps, "variant" | "size" | "fullWidth"> & { className?: string }) {
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);
}

function Content({
  icon,
  iconPosition = "start",
  iconClassName,
  children,
}: Pick<StyleProps, "icon" | "iconPosition" | "iconClassName"> & { children: ReactNode }) {
  const iconEl = icon ? (
    <span aria-hidden="true" className={cn("inline-flex shrink-0 [&>svg]:size-6", iconClassName)}>
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

type ButtonProps = StyleProps & ComponentProps<"button">;

export function Button({
  variant,
  size,
  fullWidth,
  icon,
  iconPosition,
  iconClassName,
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      <Content icon={icon} iconPosition={iconPosition} iconClassName={iconClassName}>
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
  iconClassName,
  className,
  href,
  external,
  children,
  ...rest
}: ButtonLinkProps) {
  const classes = buttonClasses({ variant, size, fullWidth, className });
  const content = (
    <Content icon={icon} iconPosition={iconPosition} iconClassName={iconClassName}>
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
