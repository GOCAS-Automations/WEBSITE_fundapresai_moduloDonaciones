"use client";

/**
 * «Donar» del header (escritorio y celular), según la página:
 * - Detalle de una campaña activa: dona A ESA CAMPAÑA (su enlace de Donar
 *   Online con UTM, en la misma pestaña, como los demás botones «Donar»).
 * - Landing: baja a «Campañas» y mueve el foco a su título (SectionLinks).
 * - Privacidad, 404 y el resto: lleva a /#campanas.
 * La ruta se lee con usePathname(), así que el enlace correcto ya va en el
 * HTML estático de cada página.
 */
import { HandHeart } from "lucide-react";
import { usePathname } from "next/navigation";

import { ButtonLink } from "@/components/ui/Button";
import { SectionButtonLink } from "./SectionLinks";

export type HeaderDonateCampaign = {
  slug: string;
  title: string;
  /** Enlace de donación ya con UTM (lib/links.ts → donationHref). */
  href: string;
};

const STYLE = {
  size: "compact" as const,
  icon: <HandHeart />,
  iconClassName: "max-[399px]:hidden",
  className: "lg:ml-3",
};

export function HeaderDonate({ campaigns }: { campaigns: HeaderDonateCampaign[] }) {
  const pathname = usePathname() ?? "";
  const slug = /^\/campanas\/([^/]+)\/?$/.exec(pathname)?.[1];
  const campaign = slug ? campaigns.find((c) => c.slug === decodeURIComponent(slug)) : undefined;

  if (campaign) {
    return (
      <ButtonLink href={campaign.href} external {...STYLE}>
        Donar
        <span className="sr-only"> a la campaña {campaign.title}</span>
      </ButtonLink>
    );
  }
  return (
    <SectionButtonLink section="campanas" {...STYLE}>
      Donar
    </SectionButtonLink>
  );
}
