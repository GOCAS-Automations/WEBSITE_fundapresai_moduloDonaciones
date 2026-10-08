import type { Metadata } from "next";

import { NotFoundView } from "@/components/site/NotFoundView";
import { getActiveCampaigns } from "@/lib/content";

/**
 * 404 de las páginas públicas: campaña inexistente u oculta (notFound() en
 * /campanas/[slug]). Se muestra dentro del layout público (header y pie).
 * Las direcciones que no existen usan app/not-found.tsx. Next agrega noindex.
 */
export const metadata: Metadata = {
  title: "Página no encontrada",
  description: "No encontramos esta página. Vea las campañas activas de la Fundación Fundapresai.",
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const campaigns = await getActiveCampaigns();
  return <NotFoundView campaigns={campaigns} />;
}
