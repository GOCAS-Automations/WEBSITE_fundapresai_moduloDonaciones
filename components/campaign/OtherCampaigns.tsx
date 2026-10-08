import { ArrowRight } from "lucide-react";

import { CampaignCard } from "@/components/campaign/CampaignCard";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { cn } from "@/components/ui/cn";
import type { PublicCampaign } from "@/lib/content";

/** `sizes` de las portadas: 1 columna en celular, 2 en tableta y 3 desde 1280 px (como en la landing). */
const CARD_SIZES = "(min-width: 1280px) 384px, (min-width: 768px) calc((100vw - 88px) / 2), calc(100vw - 56px)";

/**
 * «Otras campañas» al final del detalle (plan §5.2): 2 tarjetas en celular y
 * tableta, 3 en escritorio. Reutiliza la tarjeta de la landing.
 */
export function OtherCampaigns({ campaigns }: { campaigns: PublicCampaign[] }) {
  if (campaigns.length === 0) return null;
  const shown = campaigns.slice(0, 3);

  return (
    <section aria-labelledby="otras-campanas-title" className="bg-surface-muted py-20 lg:py-28">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading id="otras-campanas-title" eyebrow="Siga ayudando" title="Otras campañas">
            <p>Todas sostienen la educación gratuita de los niños y niñas del colegio.</p>
          </SectionHeading>
          <ButtonLink
            href="/#campanas"
            variant="secondary"
            size="lg"
            icon={<ArrowRight />}
            iconPosition="end"
            className="self-start md:self-auto"
          >
            Ver todas las campañas
          </ButtonLink>
        </div>

        <ul className={cn("mt-12 grid gap-6 md:grid-cols-2 xl:gap-7", shown.length >= 3 && "xl:grid-cols-3")}>
          {shown.map((campaign, index) => (
            <li key={campaign.id} className={index === 2 ? "max-xl:hidden" : undefined}>
              <CampaignCard campaign={campaign} imageSizes={CARD_SIZES} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
