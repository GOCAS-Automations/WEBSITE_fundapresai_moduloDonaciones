import { ArrowRight, HandCoins, Star } from "lucide-react";

import { CampaignCover } from "@/components/campaign/CampaignCover";
import { DonateLink, DonateNote } from "@/components/campaign/DonateLink";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { ProgressBar, progressLabelOf } from "@/components/ui/ProgressBar";
import { Tag } from "@/components/ui/Tag";
import type { PublicCampaign } from "@/lib/content";

type CampaignCardProps = {
  campaign: PublicCampaign;
  /** `sizes` de la portada según el ancho que ocupa la tarjeta en la grilla. */
  imageSizes: string;
  /** Muestra la insignia «Campaña destacada» sobre la portada. */
  featured?: boolean;
  className?: string;
};

/**
 * Tarjeta de campaña (plan §5.1). La tarjeta NO es un enlace: tiene dos
 * acciones claras («Donar» y «Ver detalles») para evitar toques accidentales.
 *
 * Se adapta a su propio ancho (container queries): la portada va arriba; si
 * la tarjeta mide 70rem o más (la destacada en escritorio), pasa a dos
 * columnas con la portada a la izquierda. Con menos ancho, la portada en
 * horizontal quedaría muy recortada y ampliada.
 */
export function CampaignCard({ campaign, imageSizes, featured = false, className }: CampaignCardProps) {
  const titleId = `campana-${campaign.slug}`;
  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "@container/card h-full rounded-[var(--radius-card)] bg-surface p-2 shadow-soft ring-1 ring-black/[0.05]",
        className,
      )}
    >
      <div className="grid h-full grid-rows-[auto_1fr] @min-[70rem]/card:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] @min-[70rem]/card:grid-rows-1">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[1.125rem] bg-brand-purple-soft @min-[70rem]/card:aspect-auto @min-[70rem]/card:min-h-[22rem]">
          <CampaignCover src={campaign.cover_image_url} alt={campaign.cover_image_alt} sizes={imageSizes} />
          {featured && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3.5 py-1 text-sm font-semibold text-brand-purple-dark shadow-soft backdrop-blur-sm">
              <Star aria-hidden="true" className="size-4 fill-brand-orange text-brand-orange" />
              Campaña destacada
            </span>
          )}
        </div>

        <div className="@container/body flex flex-col px-4 pb-4 pt-5 @min-[70rem]/card:justify-center @min-[70rem]/card:px-8 @min-[70rem]/card:py-8">
          {campaign.tag && <Tag className="self-start">{campaign.tag}</Tag>}
          <h3
            id={titleId}
            className={cn(
              "mt-3 text-2xl tracking-[-0.01em] text-ink",
              "@min-[70rem]/card:text-3xl",
            )}
          >
            {campaign.title}
          </h3>
          <p className="mt-2 text-ink-muted">{campaign.summary}</p>

          {campaign.donation_note && (
            // Solo en la tarjeta ancha (destacada), donde sobra espacio.
            <p className="mt-4 hidden items-center gap-2.5 text-base text-ink @min-[70rem]/card:flex">
              <HandCoins aria-hidden="true" className="size-6 shrink-0 text-brand-purple" />
              {campaign.donation_note}
            </p>
          )}

          {campaign.progress_percent !== null && (
            <ProgressBar value={campaign.progress_percent} label={progressLabelOf(campaign)} className="mt-5" />
          )}

          <div className="mt-auto pt-6 @min-[70rem]/card:mt-0 @min-[70rem]/card:pt-7">
            <div className="grid gap-3 @min-[26rem]/body:grid-cols-2">
              <DonateLink campaign={campaign} fullWidth />
              <ButtonLink
                href={`/campanas/${campaign.slug}`}
                variant="secondary"
                size="lg"
                fullWidth
                icon={<ArrowRight />}
                iconPosition="end"
              >
                Ver detalles
                <span className="sr-only"> de {campaign.title}</span>
              </ButtonLink>
            </div>
            <DonateNote className="mt-4" />
          </div>
        </div>
      </div>
    </article>
  );
}
