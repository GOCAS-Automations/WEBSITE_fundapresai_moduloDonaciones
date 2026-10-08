import { HandHeart, LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { donationHref } from "@/lib/links";

/** Línea que acompaña a todo botón «Donar» (plan §5.3). */
export const DONAR_ONLINE_NOTE =
  "Será llevado a Donar Online, la plataforma segura donde recibimos las donaciones.";

type DonateLinkProps = {
  campaign: { slug: string; title: string; donation_url: string };
  /** Texto visible. El nombre accesible agrega la campaña («Donar a Unidos por su Educación»). */
  label?: string;
  size?: "lg" | "xl";
  fullWidth?: boolean;
  className?: string;
  iconClassName?: string;
};

/**
 * Botón «Donar»: abre Donar Online en la MISMA pestaña (el botón «atrás» del
 * celular devuelve al sitio) con rel="noopener" y parámetros UTM.
 */
export function DonateLink({
  campaign,
  label = "Donar",
  size = "lg",
  fullWidth,
  className,
  iconClassName,
}: DonateLinkProps) {
  return (
    <ButtonLink
      href={donationHref(campaign.donation_url, campaign.slug)}
      external
      size={size}
      fullWidth={fullWidth}
      icon={<HandHeart />}
      iconClassName={iconClassName}
      className={className}
    >
      {label}
      <span className="sr-only"> a la campaña {campaign.title}</span>
    </ButtonLink>
  );
}

/** «Será llevado a Donar Online…», con candado. Va debajo del botón (o un texto propio, p. ej. en el hero). */
export function DonateNote({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <p className={cn("flex gap-2.5 text-sm text-ink-muted", className)}>
      <LockKeyhole aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-purple" />
      <span>{children ?? DONAR_ONLINE_NOTE}</span>
    </p>
  );
}
