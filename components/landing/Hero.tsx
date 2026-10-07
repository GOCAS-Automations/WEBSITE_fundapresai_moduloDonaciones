import { ArrowDown, Star } from "lucide-react";

import { LeafSymbol } from "@/components/brand/LeafSymbol";
import { CampaignCover } from "@/components/campaign/CampaignCover";
import { DonateLink, DonateNote } from "@/components/campaign/DonateLink";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Tag } from "@/components/ui/Tag";
import type { PublicCampaign } from "@/lib/content";
import type { Hero as HeroContent } from "@/lib/validations";

/**
 * Parte el título en su primera frase y el resto, para pintar la segunda en
 * morado («¿Se siente inspirado? | Su aporte transformará vidas.»).
 * Si el título es una sola frase, va completo en el color de texto.
 */
function splitTitle(title: string): [string, string | null] {
  const match = title.match(/^(.+?[?!.])\s+(\S.*)$/);
  return match ? [match[1], match[2]] : [title, null];
}

type HeroProps = {
  content: HeroContent;
  featured: PublicCampaign | null;
};

/** Hero (plan §5.1): Large Title cálido, dos acciones y la campaña destacada. */
export function Hero({ content, featured }: HeroProps) {
  const [first, second] = splitTitle(content.title);

  return (
    <section aria-labelledby="hero-title" className="relative isolate -mt-[4.5rem] overflow-hidden lg:-mt-20">
      {/* Fondo y motivo de hojas: solo decoración. */}
      <div aria-hidden="true" className="bg-hero-mesh pointer-events-none absolute inset-0 -z-10">
        <LeafSymbol
          tone="soft"
          className="absolute -right-24 top-16 w-[22rem] opacity-70 sm:-right-16 sm:w-[30rem] lg:hidden"
        />
      </div>

      <Container className="grid items-center gap-12 pb-12 pt-[calc(4.5rem+2.5rem)] sm:pt-[calc(4.5rem+3.5rem)] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-16 lg:pb-20 lg:pt-[calc(5rem+4.5rem)]">
        <div className="relative z-10">
          {content.eyebrow && (
            <p className="inline-flex items-center gap-2.5 rounded-full bg-white/80 py-1.5 pl-2 pr-4 text-base font-semibold text-brand-purple-dark shadow-soft ring-1 ring-black/[0.05] backdrop-blur">
              <span className="grid size-8 place-items-center rounded-full bg-brand-purple-soft">
                <LeafSymbol className="w-5" />
              </span>
              {content.eyebrow}
            </p>
          )}

          <h1
            id="hero-title"
            className="mt-6 text-[2.25rem] leading-[1.1] tracking-[-0.025em] sm:text-5xl sm:leading-[1.08] lg:text-5xl xl:text-[3.5rem] xl:leading-[1.06]"
          >
            {first}
            {second && (
              <>
                {" "}
                <span className="text-brand-purple">{second}</span>
              </>
            )}
          </h1>

          <p className="mt-6 max-w-xl text-lg text-ink-muted sm:text-xl sm:leading-[1.65]">{content.subtitle}</p>

          {featured && (
            <div className="mt-8 flex items-center gap-4 rounded-[1.25rem] bg-white/85 p-3 pr-4 shadow-soft ring-1 ring-black/[0.05] backdrop-blur lg:hidden">
              <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-2xl bg-brand-purple-soft">
                <CampaignCover src={featured.cover_image_url} alt="" sizes="80px" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-ink-muted">Campaña destacada</p>
                <p className="font-semibold leading-snug text-ink">{featured.title}</p>
                {featured.progress_percent !== null && (
                  <p className="text-sm text-ink-muted">
                    <strong className="font-semibold text-brand-purple">{featured.progress_percent} %</strong> de la
                    meta
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {featured && <DonateLink campaign={featured} label={content.primary_cta_label} size="xl" />}
            <ButtonLink href="#campanas" variant="secondary" size="xl" icon={<ArrowDown />}>
              {content.secondary_cta_label}
            </ButtonLink>
          </div>
          {featured && <DonateNote className="mt-5 max-w-md" />}
        </div>

        {featured && (
          <div className="relative isolate hidden lg:block">
            {/* Las hojas del símbolo «sostienen» la tarjeta (decorativo). */}
            <LeafSymbol
              tone="soft"
              className="absolute -bottom-16 left-[58%] -z-10 w-[150%] max-w-none -translate-x-1/2"
            />
            {/* Tarjetas apiladas detrás: sugieren que hay más campañas. */}
            <div
              aria-hidden="true"
              className="absolute inset-x-10 -top-5 bottom-10 rounded-[1.75rem] bg-white/45 shadow-soft ring-1 ring-black/[0.04]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-5 -top-2.5 bottom-5 rounded-[1.75rem] bg-white/70 shadow-soft ring-1 ring-black/[0.04]"
            />
            <article
              aria-label={`Campaña destacada: ${featured.title}`}
              className="relative rounded-[1.75rem] bg-surface p-2.5 shadow-lifted ring-1 ring-black/[0.05]"
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-[1.25rem] bg-brand-purple-soft">
                <CampaignCover
                  src={featured.cover_image_url}
                  alt={featured.cover_image_alt}
                  sizes="(min-width: 1280px) 520px, (min-width: 1024px) 42vw, 1px"
                  fetchPriority="high"
                />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3.5 py-1 text-sm font-semibold text-brand-purple-dark shadow-soft backdrop-blur-sm">
                  <Star aria-hidden="true" className="size-4 fill-brand-orange text-brand-orange" />
                  Campaña destacada
                </span>
              </div>
              <div className="px-4 pb-4 pt-5">
                {featured.tag && <Tag>{featured.tag}</Tag>}
                <p className="mt-3 text-2xl font-semibold tracking-[-0.01em] text-ink">{featured.title}</p>
                {featured.progress_percent !== null && (
                  <ProgressBar value={featured.progress_percent} label="de la meta" className="mt-4" />
                )}
                <DonateLink campaign={featured} fullWidth className="mt-6" />
              </div>
            </article>
          </div>
        )}
      </Container>
    </section>
  );
}
