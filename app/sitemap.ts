import type { MetadataRoute } from "next";

import { getActiveCampaigns, getSiteSettings } from "@/lib/content";
import { absoluteUrl } from "@/lib/seo";

/**
 * Sitemap dinámico (plan §11): la landing, las campañas ACTIVAS y privacidad.
 * Lee funciones "use cache": se genera estático y el panel lo invalida con
 * las etiquetas de campañas y contenido (lib/revalidate.ts), así una campaña
 * oculta desaparece de aquí al guardarla.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [campaigns, settings] = await Promise.all([getActiveCampaigns(), getSiteSettings()]);
  const dates = [settings?.updatedAt, ...campaigns.map((c) => c.updated_at)].filter(Boolean) as string[];
  const latest = dates.length ? new Date(Math.max(...dates.map((d) => Date.parse(d)))) : undefined;

  return [
    { url: absoluteUrl("/"), lastModified: latest, changeFrequency: "weekly", priority: 1 },
    ...campaigns.map((c) => ({
      url: absoluteUrl(`/campanas/${c.slug}`),
      lastModified: new Date(c.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      ...(c.cover_image_url ? { images: [c.cover_image_url] } : {}),
    })),
    {
      url: absoluteUrl("/privacidad"),
      lastModified: settings?.updatedAt ? new Date(settings.updatedAt) : undefined,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
