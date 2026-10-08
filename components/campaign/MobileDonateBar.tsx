import { LockKeyhole } from "lucide-react";

import { DonateLink } from "@/components/campaign/DonateLink";

/**
 * Barra inferior fija con «Donar» en celular y tableta (plan §5.2). Respeta
 * la zona segura del iPhone (env(safe-area-inset-bottom)). El espacio de
 * reserva al final de la página (para que no tape el contenido ni el pie) y
 * el scroll-padding (para que no tape el foco del teclado) están en
 * globals.css, activos solo cuando la barra existe ([data-donate-bar]).
 *
 * Va FUERA de <main>, como región complementaria de primer nivel.
 */
export function MobileDonateBar({ campaign }: { campaign: { slug: string; title: string; donation_url: string } }) {
  return (
    <aside
      aria-label="Donar a esta campaña"
      data-donate-bar=""
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.08] bg-white/90 shadow-[0_-10px_30px_-12px_rgb(43_34_51/0.18)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
        <p className="min-w-0 flex-1 text-base leading-snug text-ink-muted">
          <span className="flex items-center gap-1.5 font-semibold text-ink">
            <LockKeyhole aria-hidden="true" className="size-[1.125rem] shrink-0 text-brand-purple" />
            Pago seguro
          </span>
          en Donar Online
        </p>
        <DonateLink campaign={campaign} iconClassName="max-[359px]:hidden" className="shrink-0" />
      </div>
    </aside>
  );
}
