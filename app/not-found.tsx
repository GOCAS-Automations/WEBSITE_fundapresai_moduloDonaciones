import type { Metadata } from "next";

import { NotFoundView } from "@/components/site/NotFoundView";
import { SiteFrame } from "@/components/site/SiteFrame";
import { getActiveCampaigns } from "@/lib/content";

/**
 * 404 de las direcciones que no existen (p. ej. /campanas-viejas). Se muestra
 * fuera del layout público, así que trae su propio marco (header y pie). Las
 * campañas inexistentes u ocultas usan app/(public)/not-found.tsx.
 */
export const metadata: Metadata = {
  title: "Página no encontrada",
  description: "No encontramos esta página. Vea las campañas activas de la Fundación Fundapresai.",
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const campaigns = await getActiveCampaigns();
  return (
    <SiteFrame>
      <NotFoundView campaigns={campaigns} />
    </SiteFrame>
  );
}
