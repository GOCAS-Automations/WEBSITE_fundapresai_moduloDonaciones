import { ArrowUp, HandHeart, MousePointerClick, ShieldCheck } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import type { HowToDonate as HowToDonateContent } from "@/lib/validations";
import { SectionHeading } from "./SectionHeading";

/** Ícono y tinte de cada paso (círculos con tinte de la paleta, como en el manual). */
const STEP_STYLES = [
  { icon: MousePointerClick, circle: "bg-brand-purple-soft text-brand-purple" },
  { icon: HandHeart, circle: "bg-brand-periwinkle-soft text-brand-periwinkle-ink" },
  { icon: ShieldCheck, circle: "bg-brand-orange-soft text-brand-orange-ink" },
] as const;

/** «Cómo donar» en 3 pasos (plan §5.1). */
export function HowToDonate({ content }: { content: HowToDonateContent }) {
  return (
    <section id="como-donar" aria-labelledby="como-donar-title" className="bg-surface py-20 lg:py-28">
      <Container>
        <SectionHeading id="como-donar-title" eyebrow="Cómo donar" title={content.title} align="center" />

        <ol className="mt-12 grid gap-5 lg:mt-14 lg:grid-cols-3 lg:gap-7">
          {content.steps.map((step, index) => {
            const { icon: Icon, circle } = STEP_STYLES[index % STEP_STYLES.length];
            return (
              <li
                key={step.title}
                className="relative overflow-hidden rounded-[var(--radius-card)] bg-surface-muted p-7 ring-1 ring-black/[0.03] sm:flex sm:items-start sm:gap-7 sm:p-8 lg:block"
              >
                {/* Número grande de fondo (decorativo: «Paso N» ya lo dice en texto). */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-3 right-5 select-none text-[7rem] font-semibold leading-none tracking-[-0.04em] text-black/[0.045]"
                >
                  {index + 1}
                </span>
                <span
                  aria-hidden="true"
                  className={`relative grid size-[4.5rem] shrink-0 place-items-center rounded-full ring-[6px] ring-white ${circle}`}
                >
                  <Icon className="size-8" strokeWidth={1.75} />
                </span>
                <div className="relative mt-6 sm:mt-1 lg:mt-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-muted">Paso {index + 1}</p>
                  <h3 className="mt-1 text-2xl tracking-[-0.01em]">{step.title}</h3>
                  <p className="mt-2 max-w-xl text-ink-muted">{step.text}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-12 flex justify-center">
          <ButtonLink href="#campanas" size="lg" variant="secondary" icon={<ArrowUp />}>
            Ver las campañas
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
