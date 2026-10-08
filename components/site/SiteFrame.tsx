import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getActiveCampaigns, getCopyrightYear, getSiteSettings } from "@/lib/content";
import { donationHref } from "@/lib/links";

/**
 * Marco de las páginas públicas: enlace para saltar al contenido, header fijo
 * y pie. Lo usan el layout público y la página 404 (que se muestra fuera de
 * ese layout). Lee solo funciones "use cache" (lib/content.ts), así que no
 * impide que las páginas se prerendericen como estáticas.
 */
export async function SiteFrame({ children }: { children: ReactNode }) {
  const [settings, year, campaigns] = await Promise.all([getSiteSettings(), getCopyrightYear(), getActiveCampaigns()]);
  // «Donar» del header en el detalle de cada campaña: su propio enlace de donación.
  const donateCampaigns = campaigns.map((c) => ({ slug: c.slug, title: c.title, href: donationHref(c.donation_url, c.slug) }));

  return (
    <>
      <a
        href="#contenido"
        className="sr-only z-[60] rounded-full bg-brand-purple text-lg font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:px-6 focus:py-3"
      >
        Saltar al contenido
      </a>
      <SiteHeader donateCampaigns={donateCampaigns} />
      {children}
      <SiteFooter contact={settings?.contact ?? null} socials={settings?.socials ?? null} year={year} />
    </>
  );
}
