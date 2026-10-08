/** Enlaces directos de contacto (plan §5.1: tel:, https://wa.me/, mailto:). */

const COUNTRY_CODE = "57"; // Colombia

/** Solo dígitos, con indicativo de país si el número es nacional (10 dígitos). */
export function phoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `${COUNTRY_CODE}${digits}` : digits;
}

export function telHref(phone: string): string {
  return `tel:+${phoneDigits(phone)}`;
}

export function whatsappHref(phone: string, message?: string): string {
  const base = `https://wa.me/${phoneDigits(phone)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function mailtoHref(email: string, subject?: string): string {
  return subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`;
}

/**
 * Enlace de donación con parámetros UTM (plan §5.3), solo para Donar Online.
 *
 * Probado el 2026-10-07: las 4 campañas responden 200, sin redirecciones y con
 * la misma página, con y sin `?utm_source=fundapresai&utm_medium=web&utm_campaign=<slug>`.
 * Otros dominios (o una URL inválida) se devuelven tal cual, y nunca se pisan
 * parámetros que la URL ya traiga.
 */
export function donationHref(donationUrl: string, slug: string): string {
  let url: URL;
  try {
    url = new URL(donationUrl);
  } catch {
    return donationUrl;
  }
  const host = url.hostname.toLowerCase();
  if (host !== "donaronline.org" && !host.endsWith(".donaronline.org")) return donationUrl;
  const utm = { utm_source: "fundapresai", utm_medium: "web", utm_campaign: slug };
  for (const [key, value] of Object.entries(utm)) {
    if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return url.toString();
}

/** Sitio web del colegio ya listo para mostrar: su enlace y el dominio sin «www.» (para el texto del enlace). */
export type SchoolSite = { href: string; host: string };

/**
 * Sitio del colegio a partir de `site_settings.socials.website` (se edita en el
 * panel). Devuelve null si está vacío o no es una dirección http(s) válida, y
 * entonces no se muestran los enlaces al sitio del colegio.
 */
export function schoolSite(website: string | null | undefined): SchoolSite | null {
  const raw = website?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  return { href: raw, host: url.hostname.replace(/^www\./i, "") };
}
