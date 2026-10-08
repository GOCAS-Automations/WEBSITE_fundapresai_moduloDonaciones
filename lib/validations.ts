/**
 * Esquemas Zod de todo lo que entra por el panel (plan §4, §9 y §12).
 * Los mensajes van en español claro, con trato de usted.
 * Los mismos esquemas validan lo que se lee de la base (lib/content.ts).
 */
import { z } from "zod";

// -----------------------------------------------------------------------------
// Utilidades
// -----------------------------------------------------------------------------

/** Convierte "" (campo vacío de un formulario) en null. */
const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

/** true si es una URL absoluta válida con https://. */
export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

const HTTPS_MESSAGE = "El enlace debe ser una dirección completa que empiece por https://";

/** URL https obligatoria. */
export const httpsUrl = (requiredMessage = "Escriba el enlace.") =>
  z
    .string(requiredMessage)
    .trim()
    .min(1, requiredMessage)
    .max(2048, "El enlace es demasiado largo.")
    .refine(isHttpsUrl, HTTPS_MESSAGE);

/** URL https opcional ("" → null). */
export const optionalHttpsUrl = () =>
  z.preprocess(
    emptyToNull,
    z.string().trim().max(2048, "El enlace es demasiado largo.").refine(isHttpsUrl, HTTPS_MESSAGE).nullable(),
  );

/** Texto obligatorio con límite de caracteres. */
const requiredText = (label: string, max: number) =>
  z
    .string(`Escriba ${label}.`)
    .trim()
    .min(1, `Escriba ${label}.`)
    .max(max, `Use máximo ${max} caracteres en ${label}.`);

/** Texto opcional ("" → null) con límite de caracteres. */
const optionalText = (label: string, max: number) =>
  z.preprocess(
    emptyToNull,
    z.string().trim().max(max, `Use máximo ${max} caracteres en ${label}.`).nullable(),
  );

/** Casilla de formulario ("on", "true", true) → boolean. */
const checkbox = z.preprocess(
  (v) => v === true || v === "on" || v === "true" || v === "1",
  z.boolean(),
);

// -----------------------------------------------------------------------------
// Slug
// -----------------------------------------------------------------------------

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** «Unidos por su Educación» → «unidos-por-su-educacion». */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export const slugSchema = z
  .string("Escriba la dirección de la página.")
  .trim()
  .toLowerCase()
  .min(1, "Escriba la dirección de la página.")
  .max(80, "Use máximo 80 caracteres en la dirección.")
  .regex(
    SLUG_PATTERN,
    "Use solo letras minúsculas sin tildes, números y guiones. Ejemplo: unidos-por-su-educacion",
  );

// -----------------------------------------------------------------------------
// Campañas
// -----------------------------------------------------------------------------

export const CAMPAIGN_STATUSES = ["draft", "active", "hidden"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Borrador",
  active: "Activa",
  hidden: "Oculta",
};

export const campaignSchema = z.object({
  slug: slugSchema,
  title: requiredText("el título", 70),
  tag: optionalText("la etiqueta", 40),
  summary: requiredText("el resumen", 160),
  body_md: z.string().trim().max(20000, "El contenido es demasiado largo (máximo 20.000 caracteres)."),
  cover_image_url: httpsUrl("Agregue la imagen de portada."),
  cover_image_alt: requiredText("la descripción de la imagen", 200),
  donation_url: httpsUrl("Escriba el enlace de Donar Online."),
  donation_note: optionalText("la nota de donación", 200),
  progress_percent: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : typeof v === "string" ? Number(v) : v),
    z
      .number("Escriba un número del 0 al 100.")
      .int("Escriba un número entero, sin decimales.")
      .min(0, "El avance no puede ser menor que 0.")
      .max(100, "El avance no puede ser mayor que 100.")
      .nullable(),
  ),
  progress_label: optionalText("el texto del avance", 60),
  status: z.enum(CAMPAIGN_STATUSES, "Elija un estado: activa, borrador u oculta."),
  is_featured: checkbox,
  sort_order: z.coerce
    .number("El orden debe ser un número.")
    .int("El orden debe ser un número entero.")
    .min(0, "El orden no puede ser negativo.")
    .max(9999, "El orden es demasiado grande."),
  seo_title: optionalText("el título para buscadores", 70),
  seo_description: optionalText("la descripción para buscadores", 170),
});

export type CampaignInput = z.infer<typeof campaignSchema>;

/**
 * Advertencia (no bloquea) si el enlace de donación no es de Donar Online.
 * Devuelve el texto a mostrar o null si todo está bien.
 */
export function donationUrlWarning(url: string): string | null {
  if (!isHttpsUrl(url)) return null;
  const host = new URL(url).hostname.toLowerCase();
  if (host === "donaronline.org" || host.endsWith(".donaronline.org")) return null;
  return "Este enlace no es de Donar Online (donaronline.org). Revise que sea el correcto antes de guardar.";
}

// -----------------------------------------------------------------------------
// site_settings: un esquema por bloque (cada bloque tiene su botón Guardar)
// -----------------------------------------------------------------------------

/**
 * Texto alternativo de la imagen de un bloque. En la base puede faltar (datos
 * anteriores a este campo): se lee como null. Si hay imagen, es obligatorio
 * al guardar (ver requireAltWithImage).
 */
const imageAlt = () =>
  z.preprocess(
    (v) => (v === undefined ? null : emptyToNull(v)),
    z.string().trim().max(200, "Use máximo 200 caracteres en la descripción de la imagen.").nullable(),
  );

const IMAGE_ALT_MESSAGE =
  "Escriba la descripción de la imagen: la leen las personas que no pueden verla. Ejemplo: Niños del colegio en el patio.";

/** Con imagen, la descripción es obligatoria (WCAG 1.1.1). */
function requireAltWithImage(value: { image_url: string | null; image_alt: string | null }, ctx: z.RefinementCtx) {
  if (value.image_url && !value.image_alt) {
    ctx.addIssue({ code: "custom", path: ["image_alt"], message: IMAGE_ALT_MESSAGE });
  }
}

/** Campos del hero tal como se leen de la base (sin exigir la descripción, para no tumbar el bloque). */
export const heroFieldsSchema = z.object({
  eyebrow: optionalText("el texto pequeño superior", 60),
  title: requiredText("el título principal", 120),
  subtitle: requiredText("el subtítulo", 280),
  image_url: optionalHttpsUrl(),
  image_alt: imageAlt(),
  primary_cta_label: requiredText("el texto del botón principal", 30),
  secondary_cta_label: requiredText("el texto del botón secundario", 30),
});

/** Hero al guardar desde el panel. */
export const heroSchema = heroFieldsSchema.superRefine(requireAltWithImage);

export const statSchema = z.object({
  value: requiredText("la cifra", 12),
  label: requiredText("la descripción de la cifra", 80),
});

/** «Quiénes somos» tal como se lee de la base. */
export const aboutFieldsSchema = z.object({
  title: requiredText("el título", 80),
  body_md: requiredText("el texto", 5000),
  image_url: optionalHttpsUrl(),
  image_alt: imageAlt(),
  stats: z.array(statSchema).max(4, "Use máximo 4 cifras."),
});

/** «Quiénes somos» al guardar desde el panel. */
export const aboutSchema = aboutFieldsSchema.superRefine(requireAltWithImage);

export const stepSchema = z.object({
  title: requiredText("el título del paso", 60),
  text: requiredText("el texto del paso", 200),
});

export const howToDonateSchema = z.object({
  title: requiredText("el título", 80),
  steps: z.array(stepSchema).length(3, "Deben ser exactamente 3 pasos."),
});

export const helpSchema = z.object({
  title: requiredText("el título", 80),
  text: requiredText("el texto", 300),
  whatsapp_label: requiredText("el texto del botón de WhatsApp", 40),
});

const PHONE_PATTERN = /^\+?[\d\s()-]{7,20}$/;
const phone = (label: string) =>
  z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .regex(PHONE_PATTERN, `Escriba ${label} solo con números, espacios o el signo +. Ejemplo: 320 878 4968`)
      .nullable(),
  );

export const contactSchema = z.object({
  phone: phone("el teléfono"),
  whatsapp: phone("el número de WhatsApp"),
  email: z.preprocess(emptyToNull, z.email("Escriba un correo válido. Ejemplo: nombre@dominio.org").nullable()),
  address: optionalText("la dirección", 160),
  city: optionalText("la ciudad", 80),
  hours: optionalText("el horario", 120),
});

export const socialsSchema = z.object({
  facebook: optionalHttpsUrl(),
  instagram: optionalHttpsUrl(),
  youtube: optionalHttpsUrl(),
  website: optionalHttpsUrl(),
});

export const seoSchema = z.object({
  title: requiredText("el título para buscadores", 70),
  description: requiredText("la descripción para buscadores", 170),
  og_image_url: optionalHttpsUrl(),
});

export const privacySchema = z.object({
  privacy_md: z.string().trim().max(50000, "El texto es demasiado largo."),
});

export const siteSettingsBlockSchemas = {
  hero: heroSchema,
  about: aboutSchema,
  how_to_donate: howToDonateSchema,
  help: helpSchema,
  contact: contactSchema,
  socials: socialsSchema,
  seo: seoSchema,
} as const;

export type SiteSettingsBlock = keyof typeof siteSettingsBlockSchemas;

export type Hero = z.infer<typeof heroSchema>;
export type About = z.infer<typeof aboutSchema>;
export type HowToDonate = z.infer<typeof howToDonateSchema>;
export type Help = z.infer<typeof helpSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Socials = z.infer<typeof socialsSchema>;
export type Seo = z.infer<typeof seoSchema>;

/** Primer mensaje de error por campo, listo para mostrar junto a cada input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
