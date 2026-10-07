/**
 * Utilidades de SEO (plan §11): metadata por página, robots y JSON-LD.
 * NEXT_PUBLIC_SITE_URL define el dominio canónico; mientras
 * NEXT_PUBLIC_ALLOW_INDEXING no sea "true", todo lleva noindex.
 */
import type { Metadata } from "next";

import { getSiteUrl, isIndexingAllowed } from "@/lib/env";

export const SITE_NAME = "Fundapresai";
export const ORGANIZATION_NAME = "Fundación Fundapresai";
export const DEFAULT_TITLE = "Fundapresai · Donaciones para la educación en valores";
export const DEFAULT_DESCRIPTION =
  "Apoye la educación gratuita de niños y niñas del Colegio de Valores Humanos Sathya Sai en Funza. Elija una campaña y done de forma segura en Donar Online.";
export const LOCALE = "es_CO";

/** URL absoluta a partir de una ruta del sitio. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, `${getSiteUrl()}/`).toString();
}

export function robotsMetadata(): Metadata["robots"] {
  return isIndexingAllowed()
    ? { index: true, follow: true }
    : { index: false, follow: false, googleBot: { index: false, follow: false } };
}

type PageSeo = {
  title?: string;
  description?: string;
  /** Ruta canónica, p. ej. "/campanas/unidos-por-su-educacion". */
  path: string;
  /** Imagen para Open Graph / WhatsApp (absoluta o relativa al sitio). */
  image?: { url: string; alt?: string; width?: number; height?: number } | null;
  type?: "website" | "article";
};

/** Metadata completa de una página: title, description, canonical, OG y Twitter. */
export function buildMetadata({ title, description, path, image, type = "website" }: PageSeo): Metadata {
  const desc = description ?? DEFAULT_DESCRIPTION;
  const images = image ? [{ url: image.url, alt: image.alt, width: image.width, height: image.height }] : undefined;
  return {
    title: title ?? { absolute: DEFAULT_TITLE },
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      type,
      locale: LOCALE,
      siteName: SITE_NAME,
      url: path,
      title: title ?? DEFAULT_TITLE,
      description: desc,
      images,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: title ?? DEFAULT_TITLE,
      description: desc,
      images: image ? [image.url] : undefined,
    },
    robots: robotsMetadata(),
  };
}

type OrgInput = {
  logoPath?: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  sameAs?: (string | null | undefined)[];
};

/** JSON-LD NGO para la landing. */
export function ngoJsonLd({ logoPath = "/brand/logo-vertical.png", phone, email, city, sameAs = [] }: OrgInput) {
  return {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: ORGANIZATION_NAME,
    alternateName: SITE_NAME,
    slogan: "Inspirando vidas en valores",
    url: absoluteUrl("/"),
    logo: absoluteUrl(logoPath),
    ...(city ? { address: { "@type": "PostalAddress", addressLocality: city, addressCountry: "CO" } } : {}),
    ...(phone || email
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "donaciones",
            availableLanguage: "es",
            ...(phone ? { telephone: phone } : {}),
            ...(email ? { email } : {}),
          },
        }
      : {}),
    sameAs: sameAs.filter((u): u is string => Boolean(u)),
  };
}

type CampaignLd = { slug: string; title: string; description: string; image?: string | null; donationUrl: string };

/** JSON-LD WebPage con DonateAction para el detalle de campaña. */
export function campaignJsonLd({ slug, title, description, image, donationUrl }: CampaignLd) {
  const url = absoluteUrl(`/campanas/${slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": url,
    url,
    name: title,
    description,
    inLanguage: "es-CO",
    ...(image ? { primaryImageOfPage: { "@type": "ImageObject", url: image } } : {}),
    potentialAction: {
      "@type": "DonateAction",
      name: `Donar a ${title}`,
      target: donationUrl,
      recipient: { "@type": "NGO", name: ORGANIZATION_NAME, url: absoluteUrl("/") },
    },
  };
}

/** Serializa JSON-LD de forma segura para <script type="application/ld+json">. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\u003c");
}
