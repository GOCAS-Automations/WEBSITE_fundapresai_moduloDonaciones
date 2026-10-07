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
