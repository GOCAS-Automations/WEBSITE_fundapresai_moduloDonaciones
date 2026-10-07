/**
 * Lecturas tipadas del contenido público (plan §10: estático + revalidación
 * bajo demanda). Con Cache Components, cada lectura es una función "use cache"
 * etiquetada; el panel invalida con revalidateTag(tag, "max") / updateTag(tag)
 * y revalidatePath(...).
 *
 * Si Supabase no está configurado o falla, se devuelve null / [] con una vida
 * de caché corta: el build nunca se rompe y el sitio se recupera solo.
 */
import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { z } from "zod";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import {
  aboutSchema,
  contactSchema,
  helpSchema,
  heroSchema,
  howToDonateSchema,
  seoSchema,
  socialsSchema,
  type About,
  type Contact,
  type Help,
  type Hero,
  type HowToDonate,
  type Seo,
  type Socials,
} from "@/lib/validations";

export const CACHE_TAGS = {
  settings: "site-settings",
  campaigns: "campaigns",
  campaign: (slug: string) => `campaign:${slug}`,
} as const;

/** Columnas públicas de una campaña (nada interno). */
const CAMPAIGN_COLUMNS =
  "id, slug, title, tag, summary, body_md, cover_image_url, cover_image_alt, donation_url, donation_note, progress_percent, is_featured, sort_order, seo_title, seo_description, updated_at";

export type PublicCampaign = {
  id: string;
  slug: string;
  title: string;
  tag: string | null;
  summary: string;
  body_md: string;
  cover_image_url: string | null;
  cover_image_alt: string;
  donation_url: string;
  donation_note: string | null;
  progress_percent: number | null;
  is_featured: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: string;
};

export type SiteSettings = {
  hero: Hero | null;
  about: About | null;
  howToDonate: HowToDonate | null;
  help: Help | null;
  contact: Contact | null;
  socials: Socials | null;
  seo: Seo | null;
  privacyMd: string;
  updatedAt: string;
};

/** Valida un bloque jsonb; si no cumple el esquema, se omite (null) y se registra. */
function parseBlock<T>(schema: z.ZodType<T>, value: unknown, name: string): T | null {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  console.error(`[content] El bloque «${name}» de site_settings no es válido:`, result.error.issues);
  return null;
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  "use cache";
  cacheTag(CACHE_TAGS.settings);

  const supabase = createSupabasePublicClient();
  if (!supabase) {
    cacheLife("minutes");
    console.warn("[content] Supabase no está configurado: se omite site_settings.");
    return null;
  }

  const { data, error } = await supabase
    .from("site_settings")
    .select("hero, about, how_to_donate, help, contact, socials, seo, privacy_md, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    cacheLife("minutes");
    console.error("[content] No se pudo leer site_settings:", error?.message ?? "sin fila id = 1");
    return null;
  }

  cacheLife("max");
  return {
    hero: parseBlock(heroSchema, data.hero, "hero"),
    about: parseBlock(aboutSchema, data.about, "about"),
    howToDonate: parseBlock(howToDonateSchema, data.how_to_donate, "how_to_donate"),
    help: parseBlock(helpSchema, data.help, "help"),
    contact: parseBlock(contactSchema, data.contact, "contact"),
    socials: parseBlock(socialsSchema, data.socials, "socials"),
    seo: parseBlock(seoSchema, data.seo, "seo"),
    privacyMd: data.privacy_md,
    updatedAt: data.updated_at,
  };
}

/** Campañas activas en el orden de la landing (RLS ya filtra status = active). */
export async function getActiveCampaigns(): Promise<PublicCampaign[]> {
  "use cache";
  cacheTag(CACHE_TAGS.campaigns);

  const supabase = createSupabasePublicClient();
  if (!supabase) {
    cacheLife("minutes");
    console.warn("[content] Supabase no está configurado: no hay campañas.");
    return [];
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select(CAMPAIGN_COLUMNS)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    cacheLife("minutes");
    console.error("[content] No se pudieron leer las campañas:", error.message);
    return [];
  }

  cacheLife("max");
  return data satisfies PublicCampaign[];
}

/** Una campaña activa por slug, o null (→ 404). */
export async function getCampaignBySlug(slug: string): Promise<PublicCampaign | null> {
  "use cache";
  cacheTag(CACHE_TAGS.campaigns, CACHE_TAGS.campaign(slug));

  const supabase = createSupabasePublicClient();
  if (!supabase) {
    cacheLife("minutes");
    return null;
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select(CAMPAIGN_COLUMNS)
    .eq("status", "active")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    cacheLife("minutes");
    console.error(`[content] No se pudo leer la campaña «${slug}»:`, error.message);
    return null;
  }

  if (!data) {
    // Puede publicarse después: se cachea poco tiempo.
    cacheLife("minutes");
    return null;
  }
  cacheLife("max");
  return data;
}

/** Campaña destacada; si no hay, la primera activa. */
export async function getFeaturedCampaign(): Promise<PublicCampaign | null> {
  const campaigns = await getActiveCampaigns();
  return campaigns.find((c) => c.is_featured) ?? campaigns[0] ?? null;
}
