import type { MetadataRoute } from "next";

import { isIndexingAllowed } from "@/lib/env";
import { absoluteUrl } from "@/lib/seo";

/**
 * Demo en vercel.app (NEXT_PUBLIC_ALLOW_INDEXING=false): se bloquea todo.
 * Con el subdominio definitivo: todo permitido salvo /admin y /api.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexingAllowed()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
