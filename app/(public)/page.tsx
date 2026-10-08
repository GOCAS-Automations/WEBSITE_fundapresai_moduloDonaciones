import { About } from "@/components/landing/About";
import { CampaignsSection } from "@/components/landing/CampaignsSection";
import { HelpBlock } from "@/components/landing/HelpBlock";
import { Hero } from "@/components/landing/Hero";
import { HowToDonate } from "@/components/landing/HowToDonate";
import { getActiveCampaigns, getSiteSettings } from "@/lib/content";
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
 * Landing (plan §5.1). Página ESTÁTICA: solo lee funciones "use cache"
 * etiquetadas (lib/content.ts); el panel la refresca con lib/revalidate.ts.
 */
export default async function HomePage() {
  const [settings, campaigns] = await Promise.all([getSiteSettings(), getActiveCampaigns()]);
  const featured = campaigns.find((c) => c.is_featured) ?? campaigns[0] ?? null;

  return (
    <main id="contenido">
      <Hero content={settings?.hero ?? FALLBACK_HERO} featured={featured} />
      <CampaignsSection campaigns={campaigns} />
      {settings?.howToDonate && <HowToDonate content={settings.howToDonate} />}
      {settings?.about && <About content={settings.about} city={settings.contact?.city ?? null} />}
      {settings?.help && <HelpBlock content={settings.help} contact={settings.contact} />}
    </main>
  );
}
