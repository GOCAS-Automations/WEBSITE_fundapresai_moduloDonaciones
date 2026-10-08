import { HandCoins } from "lucide-react";

import { DonateLink, DonateNote } from "@/components/campaign/DonateLink";
import { WhatsappIcon } from "@/components/icons/SocialIcons";
import { cn } from "@/components/ui/cn";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { PublicCampaign } from "@/lib/content";
import { whatsappHref } from "@/lib/links";

type DonationCardProps = {
  campaign: PublicCampaign;
  /** WhatsApp (o teléfono) para el enlace «¿Tiene dudas?». */
  whatsapp: string | null;
  className?: string;
};

/**
 * Tarjeta de donación del detalle (plan §5.2): la nota de donación destacada
 * (p. ej. el monto sugerido), la barra de avance si aplica, el botón «Donar»
 * con su línea de Donar Online y un atajo a WhatsApp. En escritorio queda fija
 * al lado del texto mientras se lee.
 */
export function DonationCard({ campaign, whatsapp, className }: DonationCardProps) {
  return (
    <section
      aria-labelledby="donar-title"
      className={cn(
        "rounded-[var(--radius-panel)] bg-surface p-6 shadow-lifted ring-1 ring-black/[0.05] sm:p-8",
        className,
      )}
    >
      <h2 id="donar-title" className="text-2xl tracking-[-0.01em]">
        Haga su donación
      </h2>

      {campaign.donation_note && (
        <div className="mt-5 flex items-center gap-4 rounded-2xl bg-brand-cream p-4 ring-1 ring-brand-terracotta/20">
          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-brand-orange-ink shadow-soft"
          >
            <HandCoins className="size-6" strokeWidth={1.75} />
          </span>
          <p className="font-semibold leading-snug text-ink">{campaign.donation_note}</p>
        </div>
      )}

      {campaign.progress_percent !== null && (
        <ProgressBar value={campaign.progress_percent} label="de la meta" className="mt-6" />
      )}

      <DonateLink campaign={campaign} size="xl" fullWidth className="mt-7" />
      <DonateNote className="mt-4" />

      {whatsapp && (
        <div className="mt-6 border-t border-separator pt-5">
          <p className="text-base text-ink-muted">¿Tiene dudas antes de donar?</p>
          <a
            href={whatsappHref(whatsapp, `Hola, tengo una pregunta sobre la campaña «${campaign.title}».`)}
            rel="noopener"
            className="mt-1 inline-flex min-h-12 items-center gap-2.5 font-semibold text-whatsapp underline decoration-whatsapp/30 decoration-2 underline-offset-[6px] hover:decoration-whatsapp"
          >
            <WhatsappIcon aria-hidden="true" className="size-6 shrink-0" />
            Escríbanos por WhatsApp
          </a>
        </div>
      )}
    </section>
  );
}
