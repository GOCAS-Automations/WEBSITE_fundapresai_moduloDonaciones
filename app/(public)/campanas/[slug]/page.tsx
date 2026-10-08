import { Star } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LeafSymbol } from "@/components/brand/LeafSymbol";
import { CampaignCover } from "@/components/campaign/CampaignCover";
import { DonateLink, DonateNote } from "@/components/campaign/DonateLink";
import { DonationCard } from "@/components/campaign/DonationCard";
import { MobileDonateBar } from "@/components/campaign/MobileDonateBar";
import { OtherCampaigns } from "@/components/campaign/OtherCampaigns";
import { MarkdownContent } from "@/components/content/MarkdownContent";
import { HelpBlock } from "@/components/landing/HelpBlock";
import { BackLink } from "@/components/ui/BackLink";
import { cn } from "@/components/ui/cn";
import { Container } from "@/components/ui/Container";
import { Tag } from "@/components/ui/Tag";
import { getActiveCampaigns, getCampaignBySlug, getSiteSettings } from "@/lib/content";
import { buildMetadata, campaignJsonLd, campaignOgImage, jsonLdScript } from "@/lib/seo";

/**
 * Detalle de campaña (plan §5.2). Página ESTÁTICA:
 * - generateStaticParams prerenderiza las campañas activas en el build.
 * - Una campaña nueva o renombrada en el panel se genera en la primera visita
 *   (sin redeploy) y queda guardada; el panel invalida «campaigns» y
 *   «campaign:<slug>» (lib/revalidate.ts), así que ocultarla da 404 al
 *   recargar.
 * - `ensureStatic = "navigation"` (layout público): con un slug que no estaba
 *   en el build, la primera visita espera la página completa en vez de mandar
 *   un esqueleto, y un slug inexistente responde 404 de verdad.
 */

/** Con Cache Components debe haber al menos un parámetro: sin campañas, uno de relleno (da 404). */
const PLACEHOLDER_SLUG = "sin-campanas";

export async function generateStaticParams() {
  const campaigns = await getActiveCampaigns();
  return campaigns.length > 0 ? campaigns.map((c) => ({ slug: c.slug })) : [{ slug: PLACEHOLDER_SLUG }];
}

export async function generateMetadata({ params }: PageProps<"/campanas/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getCampaignBySlug(slug);
  if (!campaign) return { title: "Página no encontrada", robots: { index: false, follow: false } };
  return buildMetadata({
    title: campaign.seo_title ?? campaign.title,
    description: campaign.seo_description ?? campaign.summary,
    path: `/campanas/${campaign.slug}`,
    image: campaignOgImage(campaign),
  });
}

export default async function CampaignPage({ params }: PageProps<"/campanas/[slug]">) {
  const { slug } = await params;
  const [campaign, active, settings] = await Promise.all([
    getCampaignBySlug(slug),
    getActiveCampaigns(),
    getSiteSettings(),
  ]);
  if (!campaign) notFound();

  // Otras campañas: la destacada primero y luego el orden de la landing.
  const others = active.filter((c) => c.id !== campaign.id).sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
  const contact = settings?.contact ?? null;
  const whatsapp = contact?.whatsapp ?? contact?.phone ?? null;
  const hasBody = campaign.body_md.trim().length > 0;

  return (
    <>
      <main id="contenido">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(
              campaignJsonLd({
                slug: campaign.slug,
                title: campaign.seo_title ?? campaign.title,
                description: campaign.seo_description ?? campaign.summary,
                image: campaign.cover_image_url,
                donationUrl: campaign.donation_url,
              }),
            ),
          }}
        />

        <div className="relative isolate -mt-[4.5rem] overflow-x-clip lg:-mt-20">
          {/* Fondo cálido como el del inicio, que se funde con el gris de la página. */}
          <div aria-hidden="true" className="bg-hero-mesh pointer-events-none absolute inset-x-0 top-0 -z-10 h-[48rem]" />

          <Container className="pb-16 pt-[calc(4.5rem+1.25rem)] sm:pt-[calc(4.5rem+2rem)] lg:pb-24 lg:pt-[calc(5rem+2.25rem)]">
            <BackLink href="/#campanas">Volver a campañas</BackLink>

            <div className="mt-6 grid gap-y-8 lg:mt-10 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-16 xl:gap-x-14">
              {/* Encabezado: etiqueta, título (único h1), resumen y «Donar» (en celular va en la tarjeta). */}
              <header className="lg:col-span-6 lg:row-start-1 lg:self-center">
                {campaign.tag && <Tag>{campaign.tag}</Tag>}
                <h1 className="mt-4 text-[2.25rem] leading-[1.1] tracking-[-0.025em] sm:text-5xl sm:leading-[1.08] xl:text-[3.5rem] xl:leading-[1.06]">
                  {campaign.title}
                </h1>
                <p className="mt-5 max-w-xl text-lg text-ink-muted sm:text-xl sm:leading-[1.65]">{campaign.summary}</p>
                <div className="mt-8 hidden lg:block">
                  <DonateLink campaign={campaign} size="xl" className="min-w-[15rem]" />
                  <DonateNote className="mt-5 max-w-md" />
                </div>
              </header>

              {/* Portada: arriba de todo en celular; a la derecha en escritorio. */}
              <div className="relative max-lg:order-first lg:col-span-6 lg:col-start-7 lg:row-start-1">
                <LeafSymbol
                  tone="soft"
                  className="pointer-events-none absolute -bottom-14 left-1/2 -z-10 hidden w-[125%] max-w-none -translate-x-1/2 lg:block"
                />
                <div className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] bg-brand-purple-soft shadow-lifted ring-1 ring-black/[0.05]">
                  <CampaignCover
                    src={campaign.cover_image_url}
                    alt={campaign.cover_image_alt}
                    sizes="(min-width: 1280px) 600px, (min-width: 1024px) 46vw, calc(100vw - 40px)"
                    fetchPriority="high"
                  />
                  {campaign.is_featured && (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3.5 py-1 text-sm font-semibold text-brand-purple-dark shadow-soft backdrop-blur-sm">
                      <Star aria-hidden="true" className="size-4 fill-brand-orange text-brand-orange" />
                      Campaña destacada
                    </span>
                  )}
                </div>
              </div>

              {/* Donación: después del resumen en celular; fija al lado del texto en escritorio. */}
              <div
                className={cn(
                  "lg:row-start-2 lg:self-start",
                  hasBody ? "lg:sticky lg:top-28 lg:col-span-4 lg:col-start-9" : "lg:col-span-6",
                )}
              >
                <DonationCard campaign={campaign} whatsapp={whatsapp} />
              </div>

              {hasBody && (
                <div className="-mx-5 bg-surface px-5 py-10 sm:mx-0 sm:rounded-[var(--radius-panel)] sm:px-10 sm:py-12 sm:shadow-soft sm:ring-1 sm:ring-black/[0.05] lg:col-span-8 lg:row-start-2 lg:px-12 lg:py-14 xl:col-span-7">
                  <MarkdownContent className="max-w-[40rem]">{campaign.body_md}</MarkdownContent>
                </div>
              )}
            </div>
          </Container>
        </div>

        {settings?.help && <HelpBlock content={settings.help} contact={contact} />}
        <OtherCampaigns campaigns={others} />
      </main>

      <MobileDonateBar campaign={campaign} />
    </>
  );
}
