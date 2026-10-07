/**
 * Íconos de redes dibujados para este sitio (lucide 1.x ya no trae logos de
 * marcas). Mismo lenguaje que lucide: cuadrícula de 24, trazo de 2 px y
 * puntas redondeadas. Siempre decorativos: el enlace o botón lleva el texto.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...rest }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M16 7.5h-1.5A2.5 2.5 0 0 0 12 10v12" />
      <path d="M9 13h6" />
    </Base>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.25" cy="6.75" r="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function YoutubeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" />
    </Base>
  );
}

export function WhatsappIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3.5 20.5l.97-4.65A8.7 8.7 0 1 1 8.32 19.38z" />
      <path
        d="M9.1 7.6c.3-.3.8-.3 1 .1l.9 1.8c.1.3.1.6-.2.8l-.6.6c.6 1.3 1.6 2.3 2.9 2.9l.6-.6c.2-.3.5-.3.8-.2l1.8.9c.4.2.4.7.1 1l-.9.9c-.6.6-1.6.8-2.4.4a9.6 9.6 0 0 1-4.6-4.6c-.4-.8-.2-1.8.4-2.4z"
        fill="currentColor"
        stroke="none"
      />
    </Base>
  );
}
