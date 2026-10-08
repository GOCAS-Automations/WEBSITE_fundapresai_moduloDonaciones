import { ExternalLink, UserRound } from "lucide-react";
import Link from "next/link";

import { signOut } from "@/app/admin/actions";
import { LeafSymbol } from "@/components/brand/LeafSymbol";
import { SignOutButton } from "./SignOutButton";

/**
 * Barra superior translúcida del panel (estilo iOS). Sin datos del usuario: es
 * parte del shell estático. En celular no cabe todo: «Cerrar sesión» pasa a
 * «Mi cuenta» (que siempre está en la barra).
 */
export function AdminHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex min-h-16 w-full max-w-3xl items-center gap-2 px-4 py-2 sm:px-6">
        <Link
          href="/admin"
          className="-ml-1 mr-auto inline-flex min-h-12 items-center gap-2.5 rounded-xl px-1 text-lg font-semibold text-ink"
        >
          <LeafSymbol className="w-10" />
          <span>
            Panel<span className="sr-only"> de Fundapresai: ir al inicio del panel</span>
          </span>
        </Link>
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="hidden min-h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold text-brand-purple hover:bg-brand-purple-soft sm:inline-flex"
        >
          <ExternalLink aria-hidden="true" className="size-5" />
          Ver sitio<span className="sr-only"> (se abre en otra pestaña)</span>
        </a>
        <Link
          href="/admin/cuenta"
          className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold text-brand-purple hover:bg-brand-purple-soft"
        >
          <UserRound aria-hidden="true" className="size-5" />
          Mi cuenta
        </Link>
        <form action={signOut} className="hidden sm:block">
          <SignOutButton />
        </form>
      </div>
    </header>
  );
}
