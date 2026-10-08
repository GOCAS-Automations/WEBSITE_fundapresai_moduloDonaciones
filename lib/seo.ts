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

/** Tamaño de las imágenes para redes que genera el sitio (lib/og.ts). */
export const OG_SIZE = { width: 1200, height: 630 } as const;

/**
 * Imagen de marca para redes (1200×630, JPEG de ~100 KB): archivo estático
 * public/og/fundapresai.jpg (npm run brand:share). URL estable.
 */
export const BRAND_OG_IMAGE = {
  url: "/og/fundapresai.jpg",
  alt: "Logo de Fundapresai, «Inspirando vidas en valores»: ¿Se siente inspirado? Su aporte transformará vidas.",
  ...OG_SIZE,
  type: "image/jpeg",
} as const;

/**
 * Logo para buscadores (JSON-LD de la organización): PNG cuadrado de 512 px
 * sobre blanco (Google pide al menos 112×112 y que se vea bien en blanco).
 */
export const BRAND_LOGO = { url: "/brand/logo-google.png", width: 512, height: 512 } as const;

/**
 * Imagen para redes de una campaña: su portada completa, con la insignia del
 * logo, en JPEG de 1200×630 (lib/og.ts; WhatsApp no siempre muestra WebP).
 * `v` cambia con cada edición para que
 * WhatsApp y Facebook no sigan mostrando una portada vieja.
 */
export function campaignOgImage(campaign: { slug: string; updated_at: string; cover_image_alt: string }) {
  const version = Date.parse(campaign.updated_at) || 0;
  return {
    url: `/og/campanas/${campaign.slug}.jpg?v=${version.toString(36)}`,
    alt: campaign.cover_image_alt,
    ...OG_SIZE,
    type: "image/jpeg",
  };
}

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
  /** El título ya es completo (landing): no se le agrega « · Fundapresai». */
  absoluteTitle?: boolean;
  description?: string;
  /** Ruta canónica, p. ej. "/campanas/unidos-por-su-educacion". */
  path: string;
  /** Imagen para Open Graph / WhatsApp (absoluta o relativa al sitio). Por defecto, la de la marca. */
  image?: { url: string; alt?: string; width?: number; height?: number; type?: string } | null;
  type?: "website" | "article";
};

/**
 * Metadata completa de una página: title, description, canonical, Open Graph
 * y Twitter. Las rutas relativas se vuelven absolutas con metadataBase
 * (NEXT_PUBLIC_SITE_URL, en app/layout.tsx).
 */
export function buildMetadata({ title, absoluteTitle, description, path, image, type = "website" }: PageSeo): Metadata {
  const desc = description ?? DEFAULT_DESCRIPTION;
  const img = image ?? BRAND_OG_IMAGE;
  return {
    title: title && !absoluteTitle ? title : { absolute: title ?? DEFAULT_TITLE },
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      type,
      locale: LOCALE,
      siteName: SITE_NAME,
      url: path,
      title: title ?? DEFAULT_TITLE,
      description: desc,
      images: [{ url: img.url, alt: img.alt, width: img.width, height: img.height, type: img.type }],
    },
    twitter: {
      card: "summary_large_image",
      title: title ?? DEFAULT_TITLE,
      description: desc,
      images: [{ url: img.url, alt: img.alt }],
    },
    robots: robotsMetadata(),
  };
}

type OrgInput = {
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  sameAs?: (string | null | undefined)[];
};

/** Identificadores: el WebPage de cada campaña referencia a la organización y al sitio. */
const ORG_ID = "/#organizacion";
const WEBSITE_ID = "/#sitio";

/** JSON-LD NGO para la landing. */
export function ngoJsonLd({ phone, email, city, sameAs = [] }: OrgInput) {
  return {
    "@context": "https://schema.org",
    "@type": "NGO",
    "@id": absoluteUrl(ORG_ID),
    name: ORGANIZATION_NAME,
    alternateName: SITE_NAME,
    slogan: "Inspirando vidas en valores",
    description: DEFAULT_DESCRIPTION,
    url: absoluteUrl("/"),
    logo: {
      "@type": "ImageObject",
      "@id": absoluteUrl("/#logo"),
      url: absoluteUrl(BRAND_LOGO.url),
      contentUrl: absoluteUrl(BRAND_LOGO.url),
      width: BRAND_LOGO.width,
      height: BRAND_LOGO.height,
      caption: ORGANIZATION_NAME,
    },
    image: absoluteUrl(BRAND_OG_IMAGE.url),
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

/**
 * JSON-LD WebSite para la landing: Google lo usa para el NOMBRE del sitio en
 * los resultados («Fundapresai» en vez del dominio).
 */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl(WEBSITE_ID),
    name: SITE_NAME,
    alternateName: ORGANIZATION_NAME,
    url: absoluteUrl("/"),
    inLanguage: "es-CO",
    publisher: { "@id": absoluteUrl(ORG_ID) },
  };
}

type CampaignLd = { slug: string; title: string; description: string; image?: string | null; donationUrl: string };

/** JSON-LD WebPage con DonateAction para el detalle de campaña. */
export function campaignJsonLd({ slug, title, description, image, donationUrl }: CampaignLd) {
  const url = absoluteUrl(`/campanas/${slug}`);
  const org = { "@type": "NGO", "@id": absoluteUrl(ORG_ID), name: ORGANIZATION_NAME, url: absoluteUrl("/") };
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": url,
    url,
    name: title,
    description,
    inLanguage: "es-CO",
    isPartOf: { "@type": "WebSite", "@id": absoluteUrl(WEBSITE_ID), name: SITE_NAME, url: absoluteUrl("/") },
    publisher: org,
    ...(image ? { primaryImageOfPage: { "@type": "ImageObject", url: image } } : {}),
    potentialAction: {
      "@type": "DonateAction",
      name: `Donar a ${title}`,
      target: donationUrl,
      recipient: org,
    },
  };
}

/**
 * Serializa JSON-LD de forma segura para <script type="application/ld+json">:
 * «<» se escribe como la secuencia de escape JSON < (seis caracteres, no
 * el carácter), así un texto con «</script>» no puede cerrar la etiqueta.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
