import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getCopyrightYear, getSiteSettings } from "@/lib/content";

/**
 * Marco de las páginas públicas: enlace para saltar al contenido, header fijo
 * y pie. Lee solo funciones "use cache" (lib/content.ts), así que no impide que
 * las páginas se prerendericen como estáticas.
 */
export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const [settings, year] = await Promise.all([getSiteSettings(), getCopyrightYear()]);

  return (
    <>
      <a
        href="#contenido"
        className="sr-only z-[60] rounded-full bg-brand-purple text-lg font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:px-6 focus:py-3"
      >
        Saltar al contenido
      </a>
      <SiteHeader />
      {children}
      <SiteFooter contact={settings?.contact ?? null} socials={settings?.socials ?? null} year={year} />
    </>
  );
}
