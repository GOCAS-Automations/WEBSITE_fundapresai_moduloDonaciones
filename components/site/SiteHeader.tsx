import Image from "next/image";
import Link from "next/link";

import { LeafSymbol } from "@/components/brand/LeafSymbol";
import { Container } from "@/components/ui/Container";
import { HeaderDonate, type HeaderDonateCampaign } from "./HeaderDonate";
import { MobileMenu } from "./MobileMenu";
import { MAIN_NAV } from "./nav";
import { SectionLink } from "./SectionLinks";

/**
 * Header fijo y translúcido estilo iOS (plan §5.1): fondo blanco con
 * desenfoque y borde inferior fino. «Donar» (HeaderDonate) depende de la
 * página: en el detalle dona a esa campaña; en las demás lleva a «Campañas».
 * Sigue visible en el celular junto al botón «Menú».
 */
export function SiteHeader({ donateCampaigns }: { donateCampaigns: HeaderDonateCampaign[] }) {
  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/75 backdrop-blur-xl backdrop-saturate-150">
      <Container className="relative flex min-h-[var(--header-height)] items-center gap-2 py-2">
        <Link
          href="/"
          aria-label="Fundapresai, ir al inicio"
          className="-ml-2 mr-auto inline-flex min-h-12 items-center rounded-2xl px-2"
        >
          <LeafSymbol className="h-10 w-auto sm:hidden" />
          <Image
            src="/brand/logo-horizontal.png"
            alt=""
            width={209}
            height={44}
            preload
            className="hidden h-11 w-auto sm:block"
          />
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {MAIN_NAV.map((link) => (
              <li key={link.section}>
                <SectionLink
                  section={link.section}
                  className="inline-flex min-h-12 items-center rounded-full px-4 text-base font-medium text-ink transition-colors hover:bg-brand-purple-soft hover:text-brand-purple"
                >
                  {link.label}
                </SectionLink>
              </li>
            ))}
          </ul>
        </nav>

        <MobileMenu />
        <HeaderDonate campaigns={donateCampaigns} />
      </Container>
    </header>
  );
}
