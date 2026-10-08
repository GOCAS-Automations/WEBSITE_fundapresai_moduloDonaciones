import { ArrowDown, ChevronRight, Home } from "lucide-react";
import Link from "next/link";

import { LeafSymbol } from "@/components/brand/LeafSymbol";
import { CampaignCover } from "@/components/campaign/CampaignCover";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import type { PublicCampaign } from "@/lib/content";

/**
 * Página 404 amable (plan §5.2): explica en palabras sencillas qué pudo pasar
 * y ofrece salidas claras: las campañas activas, una por una, y el inicio.
 */
export function NotFoundView({ campaigns }: { campaigns: PublicCampaign[] }) {
  return (
    <main id="contenido" className="relative isolate -mt-[4.5rem] overflow-hidden lg:-mt-20">
      <div aria-hidden="true" className="bg-hero-mesh pointer-events-none absolute inset-0 -z-10">
        <LeafSymbol tone="soft" className="absolute -right-28 top-24 w-[24rem] opacity-80 sm:-right-16 sm:w-[34rem]" />
        <LeafSymbol tone="soft" className="absolute -left-40 bottom-10 hidden w-[28rem] rotate-[-8deg] opacity-60 lg:block" />
      </div>

      <Container width="narrow" className="pb-20 pt-[calc(4.5rem+3rem)] text-center sm:pt-[calc(4.5rem+4.5rem)] lg:pb-28 lg:pt-[calc(5rem+5rem)]">
        <span className="mx-auto grid size-24 place-items-center rounded-[1.75rem] bg-white shadow-lifted ring-1 ring-black/[0.05]">
          <LeafSymbol className="w-14" />
        </span>
        <p className="mt-8 text-base font-semibold tracking-wide text-brand-purple">Error 404 · Página no encontrada</p>
        <h1 className="mx-auto mt-3 max-w-2xl text-[2.25rem] leading-[1.12] tracking-[-0.025em] sm:text-5xl sm:leading-[1.08]">
          No encontramos esta página
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-ink-muted sm:text-xl sm:leading-[1.65]">
          Puede que la campaña ya haya terminado, que esté en pausa o que el enlace esté incompleto. No se preocupe:
          aquí puede seguir ayudando.
        </p>

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/#campanas" size="xl" icon={<ArrowDown />}>
            Ver las campañas
          </ButtonLink>
          <ButtonLink href="/" variant="secondary" size="xl" icon={<Home />}>
            Ir al inicio
          </ButtonLink>
        </div>

        {campaigns.length > 0 && (
          <section aria-labelledby="campanas-activas-title" className="mt-16 text-left">
            <h2 id="campanas-activas-title" className="text-center text-2xl tracking-[-0.01em]">
              Campañas que hoy puede apoyar
            </h2>
            <ul className="mt-6 space-y-3">
              {campaigns.map((campaign) => (
                <li key={campaign.id}>
                  <Link
                    href={`/campanas/${campaign.slug}`}
                    className="group flex min-h-20 items-center gap-4 rounded-[var(--radius-card)] bg-white/90 p-3 pr-5 shadow-soft ring-1 ring-black/[0.05] backdrop-blur transition-[box-shadow,background-color] hover:bg-white hover:shadow-lifted"
                  >
                    <span className="relative aspect-square w-16 shrink-0 overflow-hidden rounded-2xl bg-brand-purple-soft sm:w-20">
                      <CampaignCover src={campaign.cover_image_url} alt="" sizes="80px" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-semibold leading-snug text-ink group-hover:text-brand-purple">
                        {campaign.title}
                      </span>
                      {campaign.tag && <span className="mt-0.5 block text-base text-ink-muted">{campaign.tag}</span>}
                    </span>
                    <ChevronRight aria-hidden="true" className="size-6 shrink-0 text-brand-purple transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>
    </main>
  );
}
