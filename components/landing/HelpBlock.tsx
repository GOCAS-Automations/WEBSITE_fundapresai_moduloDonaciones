import { HeartHandshake, Phone } from "lucide-react";

import { LeafSymbol } from "@/components/brand/LeafSymbol";
import { WhatsappIcon } from "@/components/icons/SocialIcons";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { telHref, whatsappHref } from "@/lib/links";
import type { Contact, Help } from "@/lib/validations";

/** Mensaje que llega escrito al abrir WhatsApp (la persona solo toca «Enviar»). */
const WHATSAPP_MESSAGE = "Hola, quisiera ayuda para hacer una donación a Fundapresai.";

type HelpBlockProps = {
  content: Help;
  contact: Contact | null;
};

/**
 * «¿Necesita ayuda para donar?» (plan §5.1): botón grande de WhatsApp en verde
 * oscuro (texto blanco a 7:1, AAA) y el teléfono visible como texto.
 */
export function HelpBlock({ content, contact }: HelpBlockProps) {
  const whatsapp = contact?.whatsapp ?? contact?.phone ?? null;
  const phone = contact?.phone ?? null;
  if (!whatsapp && !phone) return null;

  return (
    <section id="ayuda" aria-labelledby="ayuda-title" className="bg-surface sm:py-20 lg:py-28">
      <Container>
        {/* En celular el bloque va de borde a borde (los botones caben en una línea). */}
        <div className="relative isolate -mx-5 overflow-hidden bg-[linear-gradient(135deg,var(--color-brand-pink-soft)_0%,#fff7ef_55%,var(--color-brand-cream)_100%)] px-5 py-12 sm:mx-0 sm:rounded-[var(--radius-panel)] sm:px-10 sm:py-14 sm:ring-1 sm:ring-black/[0.05] lg:px-16 lg:py-16">
          <div aria-hidden="true" className="absolute -bottom-16 -right-16 -z-10 hidden w-[26rem] opacity-[0.14] sm:block lg:w-[34rem]">
            <LeafSymbol />
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <span
                aria-hidden="true"
                className="grid size-16 place-items-center rounded-full bg-white text-brand-purple shadow-soft"
              >
                <HeartHandshake className="size-8" strokeWidth={1.75} />
              </span>
              <h2 id="ayuda-title" className="mt-6 text-3xl tracking-[-0.02em] sm:text-4xl">
                {content.title}
              </h2>
              <p className="mt-4 max-w-xl text-lg text-ink-muted">{content.text}</p>
            </div>

            <div className="sm:rounded-[var(--radius-card)] sm:bg-white/85 sm:p-7 sm:shadow-soft sm:ring-1 sm:ring-black/[0.05] sm:backdrop-blur">
              {whatsapp && (
                <>
                  <ButtonLink
                    href={whatsappHref(whatsapp, WHATSAPP_MESSAGE)}
                    variant="whatsapp"
                    size="xl"
                    fullWidth
                    icon={<WhatsappIcon />}
                  >
                    {content.whatsapp_label}
                  </ButtonLink>
                  <p className="mt-3 text-center text-base text-ink-muted">
                    WhatsApp: <strong className="font-semibold text-ink">{whatsapp}</strong>
                  </p>
                </>
              )}
              {phone && (
                <div className={whatsapp ? "mt-6 border-t border-black/[0.08] pt-6" : ""}>
                  <p className="text-center text-base text-ink-muted">¿Prefiere hablar por teléfono?</p>
                  <ButtonLink
                    href={telHref(phone)}
                    variant="secondary"
                    size="lg"
                    fullWidth
                    icon={<Phone />}
                    className="mt-3"
                  >
                    Llamar al {phone}
                  </ButtonLink>
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
