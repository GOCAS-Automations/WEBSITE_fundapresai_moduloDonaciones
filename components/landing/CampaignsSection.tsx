import { CampaignCard } from "@/components/campaign/CampaignCard";
import { Container } from "@/components/ui/Container";
import type { PublicCampaign } from "@/lib/content";
import { SectionHeading } from "./SectionHeading";

/*
 * `sizes` de las portadas (Container max-w-7xl = 1280 px con 32 px de margen;
 * la tarjeta tiene 8 px de relleno). Ver CampaignCard.
 * - Desde 1280 px: destacada a lo ancho (portada a la izquierda) + 3 columnas.
 * - De 768 a 1279 px: 2 columnas; la destacada es una tarjeta más.
 * - Celular: 1 columna.
 */
const HALF = "(min-width: 768px) calc((100vw - 88px) / 2), calc(100vw - 56px)";
const FEATURED_SIZES = `(min-width: 1280px) 620px, ${HALF}`;
const CARD_SIZES = `(min-width: 1280px) 384px, ${HALF}`;

/** Última tarjeta sola en su fila: centrada y del mismo ancho que las demás. */
const ORPHAN_CLASSES = [
  // 2 columnas (768–1279 px): queda sola si es impar.
  "md:max-xl:[&:last-child:nth-child(odd)]:col-span-2",
  "md:max-xl:[&:last-child:nth-child(odd)]:mx-auto",
  "md:max-xl:[&:last-child:nth-child(odd)]:w-[calc(50%-0.75rem)]",
  // 3 columnas (desde 1280 px, después de la destacada): sola si es 3n+2.
  "xl:[&:last-child:nth-child(3n+2)]:col-span-3",
  "xl:[&:last-child:nth-child(3n+2)]:mx-auto",
  "xl:[&:last-child:nth-child(3n+2)]:w-[calc((100%-3.5rem)/3)]",
].join(" ");

/**
 * Grilla de campañas (plan §5.1): 1 columna en celular, 2 en tablet y 3 en
 * escritorio. La destacada va primero; en escritorio ocupa la fila completa.
 * Si la última fila queda con una sola tarjeta, se centra.
 */
export function CampaignsSection({ campaigns }: { campaigns: PublicCampaign[] }) {
  const featured = campaigns.find((c) => c.is_featured) ?? campaigns[0];
  const ordered = featured ? [featured, ...campaigns.filter((c) => c.id !== featured.id)] : [];

  return (
    <section id="campanas" aria-labelledby="campanas-title" className="bg-surface-muted pb-20 pt-12 lg:pb-28 lg:pt-16">
      <Container>
        <SectionHeading id="campanas-title" eyebrow="Campañas" title="Elija la campaña que quiere apoyar">
          <p>
            Todas sostienen la educación gratuita de los niños y niñas del Colegio de Valores Humanos Sathya Sai.
            Toque «Donar» en la que prefiera.
          </p>
        </SectionHeading>

        {ordered.length === 0 ? (
          <p className="mt-12 rounded-[var(--radius-card)] bg-surface p-8 text-lg shadow-soft">
            En este momento no hay campañas publicadas. Vuelva pronto o escríbanos por WhatsApp.
          </p>
        ) : (
          <ul className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-7">
            {ordered.map((campaign, index) => (
              <li
                key={campaign.id}
                className={index === 0 ? "xl:col-span-3" : ORPHAN_CLASSES}
              >
                <CampaignCard
                  campaign={campaign}
                  featured={index === 0}
                  imageSizes={index === 0 ? FEATURED_SIZES : CARD_SIZES}
                />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}
