import Image from "next/image";

import { LeafSymbol } from "@/components/brand/LeafSymbol";
import { cn } from "@/components/ui/cn";
import { shouldSkipOptimization } from "@/lib/images";

type CampaignCoverProps = {
  src: string | null;
  alt: string;
  /** Atributo `sizes` de next/image: el ancho real con que se muestra la imagen. */
  sizes: string;
  className?: string;
  /** Solo para la imagen que sea el LCP de la página. */
  fetchPriority?: "high" | "auto";
};

/**
 * Portada de campaña (llena su contenedor, que define la relación 16:10).
 * Sin portada, muestra una composición con la paleta y el símbolo.
 */
export function CampaignCover({ src, alt, sizes, className, fetchPriority }: CampaignCoverProps) {
  if (!src) {
    return (
      <div
        className={cn(
          "absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,var(--color-brand-purple-soft),var(--color-brand-pink-soft)_55%,var(--color-brand-cream))]",
          className,
        )}
      >
        <LeafSymbol className="w-2/5 opacity-90" />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      fetchPriority={fetchPriority}
      unoptimized={shouldSkipOptimization(src)}
      className={cn("object-cover", className)}
    />
  );
}
