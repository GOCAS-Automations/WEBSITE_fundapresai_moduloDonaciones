import type { MetadataRoute } from "next";

import { isIndexingAllowed } from "@/lib/env";
import { absoluteUrl } from "@/lib/seo";

/**
 * Lectores de vista previa de redes y mensajería. No indexan nada: solo leen
 * el título y la imagen al compartir un enlace (plan §14, fase 3: la vista
 * previa en WhatsApp). Se les permite el sitio incluso en la demo, que sigue
 * con noindex en cada página.
 */
const LINK_PREVIEW_BOTS = [
  "facebookexternalhit",
  "Facebot",
  "WhatsApp",
  "Twitterbot",
  "LinkedInBot",
  "TelegramBot",
  "Slackbot-LinkExpanding",
];

/**
 * Demo en vercel.app (NEXT_PUBLIC_ALLOW_INDEXING distinto de "true"): los
 * buscadores no pueden rastrear nada. Con el subdominio definitivo: todo
 * permitido salvo /admin y /api. /admin siempre queda bloqueado.
 */
export default function robots(): MetadataRoute.Robots {
  const previews = { userAgent: LINK_PREVIEW_BOTS, allow: "/", disallow: ["/admin", "/api/"] };
  if (!isIndexingAllowed()) {
    return { rules: [previews, { userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
