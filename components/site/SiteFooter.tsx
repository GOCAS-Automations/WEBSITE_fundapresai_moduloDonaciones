import { Globe, Mail, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { FacebookIcon, InstagramIcon, WhatsappIcon, YoutubeIcon } from "@/components/icons/SocialIcons";
import { Container } from "@/components/ui/Container";
import type { Contact, Socials } from "@/lib/validations";
import { mailtoHref, telHref, whatsappHref } from "@/lib/links";
import { ORGANIZATION_NAME } from "@/lib/seo";

type SiteFooterProps = {
  contact: Contact | null;
  socials: Socials | null;
  year: number;
};

const linkClasses =
  "group inline-flex min-h-12 items-center gap-3 rounded-xl py-2 text-ink underline decoration-brand-purple/30 decoration-2 underline-offset-[6px] transition-colors hover:text-brand-purple hover:decoration-brand-purple";

function FooterLink({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <a href={href} rel={href.startsWith("http") ? "noopener" : undefined} className={linkClasses}>
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-purple-soft text-brand-purple [&>svg]:size-5"
      >
        {icon}
      </span>
      <span>{children}</span>
    </a>
  );
}

/** Pie (plan §5.1): logo vertical, lema, contacto, redes, privacidad, © y crédito. */
export function SiteFooter({ contact, socials, year }: SiteFooterProps) {
  const socialLinks = [
    socials?.facebook && { href: socials.facebook, label: "Facebook", icon: <FacebookIcon /> },
    socials?.instagram && { href: socials.instagram, label: "Instagram", icon: <InstagramIcon /> },
    socials?.youtube && { href: socials.youtube, label: "YouTube", icon: <YoutubeIcon /> },
    socials?.website && { href: socials.website, label: "Sitio web del colegio", icon: <Globe /> },
  ].filter(Boolean) as { href: string; label: string; icon: ReactNode }[];

  return (
    <footer className="border-t border-black/[0.06] bg-surface">
      <Container className="grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr] lg:gap-16 lg:py-20">
        <div className="md:col-span-2 lg:col-span-1">
          <Image
            src="/brand/logo-vertical-sin-lema-288.png"
            alt="Fundapresai"
            width={144}
            height={134}
            // Ya viene al doble de su tamaño (npm run brand:share): sin /_next/image.
            unoptimized
            className="h-auto w-36"
          />
          <p className="mt-4 text-2xl font-medium tracking-[-0.01em] text-brand-orange-ink">
            Inspirando vidas en valores
          </p>
          <p className="mt-3 max-w-sm text-ink-muted">
            Fundación sin ánimo de lucro que forma en valores humanos
            {contact?.city ? `, en ${contact.city}.` : "."}
          </p>
        </div>

        {contact && (contact.phone || contact.whatsapp || contact.email) && (
          <div>
            <h2 className="text-xl">Contacto</h2>
            <ul className="mt-4 space-y-1">
              {contact.phone && (
                <li>
                  <FooterLink href={telHref(contact.phone)} icon={<Phone />}>
                    <span className="sr-only">Teléfono: </span>
                    {contact.phone}
                  </FooterLink>
                </li>
              )}
              {contact.whatsapp && (
                <li>
                  <FooterLink href={whatsappHref(contact.whatsapp)} icon={<WhatsappIcon />}>
                    WhatsApp {contact.whatsapp}
                  </FooterLink>
                </li>
              )}
              {contact.email && (
                <li>
                  <FooterLink href={mailtoHref(contact.email)} icon={<Mail />}>
                    {contact.email}
                  </FooterLink>
                </li>
              )}
              {(contact.address || contact.city) && (
                <li className="flex min-h-12 items-center gap-3 py-2 text-ink-muted">
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-muted text-ink-muted [&>svg]:size-5"
                  >
                    <MapPin />
                  </span>
                  <span>{[contact.address, contact.city].filter(Boolean).join(", ")}</span>
                </li>
              )}
            </ul>
          </div>
        )}

        {socialLinks.length > 0 && (
          <div>
            <h2 className="text-xl">Síganos</h2>
            <ul className="mt-4 space-y-1">
              {socialLinks.map((s) => (
                <li key={s.href}>
                  <FooterLink href={s.href} icon={s.icon}>
                    {s.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Container>

      <div className="border-t border-black/[0.06]">
        <Container className="flex flex-col gap-2 py-6 text-base text-ink-muted md:flex-row md:items-center md:justify-between md:gap-6">
          <p>
            © {year} {ORGANIZATION_NAME}
          </p>
          <Link
            href="/privacidad"
            className="inline-flex min-h-12 items-center self-start text-ink underline decoration-brand-purple/30 decoration-2 underline-offset-[6px] hover:text-brand-purple hover:decoration-brand-purple md:self-auto"
          >
            Política de privacidad
          </Link>
          <p>Sitio hecho por GOCAS Automations</p>
        </Container>
      </div>
    </footer>
  );
}
