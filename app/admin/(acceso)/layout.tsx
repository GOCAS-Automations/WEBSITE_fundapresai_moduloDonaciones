import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/** Pantallas sin sesión (entrar, recuperar y restablecer la contraseña): tarjeta centrada. */
export default function AccessLayout({ children }: { children: ReactNode }) {
  return (
    <main id="contenido" className="bg-hero-mesh flex min-h-dvh flex-col items-center px-4 py-10 sm:py-16">
      <Link href="/" className="inline-flex min-h-12 items-center rounded-2xl px-2" aria-label="Fundapresai, ir al sitio">
        <Image src="/brand/logo-horizontal.png" alt="" width={209} height={44} preload className="h-11 w-auto" />
      </Link>
      <div className="mt-8 w-full max-w-md rounded-[var(--radius-panel)] bg-surface p-6 shadow-lifted ring-1 ring-black/[0.05] sm:p-9">
        {children}
      </div>
      <p className="mt-8 max-w-md text-center text-base text-ink-muted">
        ¿Problemas para entrar? Escriba a GOCAS y con gusto le ayudamos.
      </p>
    </main>
  );
}
