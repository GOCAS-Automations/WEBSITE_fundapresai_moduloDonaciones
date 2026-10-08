import type { Metadata } from "next";

import { About } from "@/components/landing/About";
import { CampaignsSection } from "@/components/landing/CampaignsSection";
import { HelpBlock } from "@/components/landing/HelpBlock";
import { Hero } from "@/components/landing/Hero";
import { HowToDonate } from "@/components/landing/HowToDonate";
import { SectionHashFocus } from "@/components/site/SectionLinks";
import { getActiveCampaigns, getSiteSettings } from "@/lib/content";
import { phoneDigits } from "@/lib/links";
import { BRAND_OG_IMAGE, buildMetadata, jsonLdScript, ngoJsonLd, websiteJsonLd } from "@/lib/seo";
import type { Hero as HeroContent } from "@/lib/validations";

/** Respaldo si site_settings no se puede leer (el sitio nunca queda en blanco). */
const FALLBACK_HERO: HeroContent = {
  eyebrow: "Fundación Fundapresai",
  title: "¿Se siente inspirado? Su aporte transformará vidas.",
  subtitle:
    "Con su ayuda, niños y niñas del Colegio de Valores Humanos Sathya Sai de Funza reciben educación gratuita.",
  image_url: null,
  image_alt: null,
  primary_cta_label: "Donar ahora",
  secondary_cta_label: "Ver campañas",
};

/**
 * Metadata de la landing: título, descripción e imagen de «Buscadores y
 * redes» (panel). Sin imagen propia, la de la marca (/og/fundapresai.jpg).
 */
export async function generateMetadata(): Promise<Metadata> {
  const seo = (await getSiteSettings())?.seo ?? null;
  return buildMetadata({
    title: seo?.title,
    absoluteTitle: true,
    description: seo?.description,
    path: "/",
    image: seo?.og_image_url ? { url: seo.og_image_url, alt: seo.title } : BRAND_OG_IMAGE,
  });
}

/**
 * Landing (plan §5.1). Página ESTÁTICA: solo lee funciones "use cache"
 * etiquetadas (lib/content.ts); el panel la refresca con lib/revalidate.ts.
 */
export default async function HomePage() {
  const [settings, campaigns] = await Promise.all([getSiteSettings(), getActiveCampaigns()]);
  const featured = campaigns.find((c) => c.is_featured) ?? campaigns[0] ?? null;

  const contact = settings?.contact ?? null;
  const socials = settings?.socials ?? null;
  const phone = contact?.phone ?? contact?.whatsapp ?? null;
  const organization = ngoJsonLd({
    phone: phone ? `+${phoneDigits(phone)}` : null,
    email: contact?.email ?? null,
    city: contact?.city ?? null,
    sameAs: [socials?.facebook, socials?.instagram, socials?.youtube, socials?.website],
  });

  return (
    <main id="contenido">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(organization) }} />
      <Hero content={settings?.hero ?? FALLBACK_HERO} featured={featured} />
      <CampaignsSection campaigns={campaigns} />
      {settings?.howToDonate && <HowToDonate content={settings.howToDonate} />}
      {settings?.about && <About content={settings.about} city={settings.contact?.city ?? null} />}
      {settings?.help && <HelpBlock content={settings.help} contact={settings.contact} />}
      <SectionHashFocus />
    </main>
  );
}
