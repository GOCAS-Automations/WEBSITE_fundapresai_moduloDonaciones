import Image from "next/image";
import type { ReactNode } from "react";

import { BackLink } from "@/components/ui/BackLink";

/**
 * Pantallas sin sesión (entrar, recuperar y restablecer la contraseña):
 * «‹ Volver al sitio» arriba (la misma píldora de 48 px del detalle de
 * campaña) y la tarjeta centrada.
 */
export default function AccessLayout({ children }: { children: ReactNode }) {
  return (
    <main id="contenido" className="bg-hero-mesh flex min-h-dvh flex-col items-center px-4 pb-10 pt-4 sm:pb-16 sm:pt-6">
      <div className="w-full max-w-md">
        <BackLink href="/">Volver al sitio</BackLink>
      </div>
      <Image
        src="/brand/logo-horizontal-418.png"
        alt="Fundapresai"
        width={209}
        height={44}
        preload
        unoptimized
        className="mt-6 h-11 w-auto sm:mt-8"
      />
      <div className="mt-8 w-full max-w-md rounded-[var(--radius-panel)] bg-surface p-6 shadow-lifted ring-1 ring-black/[0.05] sm:p-9">
        {children}
      </div>
      <p className="mt-8 max-w-md text-center text-base text-ink-muted">
        ¿Problemas para entrar? Escriba a GOCAS y con gusto le ayudamos.
      </p>
    </main>
  );
}
