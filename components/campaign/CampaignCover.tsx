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
  /**
   * Imagen principal (LCP) que solo existe en algunos anchos (p. ej. la tarjeta
   * del hero en escritorio): se pide primero y sin carga diferida.
   */
  fetchPriority?: "high" | "auto";
  /** LCP en todos los anchos (portada del detalle): además se precarga desde el <head>. */
  preload?: boolean;
};

/**
 * Portada de campaña (llena su contenedor, que define la relación 16:10).
 * Sin portada, muestra una composición con la paleta y el símbolo.
 */
export function CampaignCover({ src, alt, sizes, className, fetchPriority, preload }: CampaignCoverProps) {
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
      {...(preload ? { preload: true } : fetchPriority === "high" ? { fetchPriority, loading: "eager" as const } : { fetchPriority })}
      unoptimized={shouldSkipOptimization(src)}
      className={cn("object-cover", className)}
    />
  );
}
