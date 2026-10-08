import { SiteFrame } from "@/components/site/SiteFrame";

/**
 * Páginas públicas (/, /campanas/[slug], /privacidad). Todas deben salir
 * estáticas: `ensureStatic = "navigation"` hace que el build falle si alguna
 * llega a leer datos sin caché, cookies o cabeceras (ver lib/content.ts).
 */
export const ensureStatic = "navigation";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return <SiteFrame>{children}</SiteFrame>;
}
