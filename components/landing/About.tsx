import { ExternalLink, MapPin } from "lucide-react";
import Image from "next/image";

import { LeafSymbol } from "@/components/brand/LeafSymbol";
import { MarkdownContent } from "@/components/content/MarkdownContent";
import { Container } from "@/components/ui/Container";
import { shouldSkipOptimization } from "@/lib/images";
import type { SchoolSite } from "@/lib/links";
import type { About as AboutContent } from "@/lib/validations";
import { SectionHeading } from "./SectionHeading";

/** Los cinco valores humanos del colegio (texto de la campaña «Colegio de Valores Humanos»). */
const VALUES = ["Verdad", "Rectitud", "Paz", "Amor", "No violencia"];

/** Fondo de cada cifra, en orden. */
const STAT_TILES = [
  "bg-brand-cream/80 ring-brand-terracotta/15",
  "bg-brand-pink-soft ring-brand-pink/40",
  "bg-brand-periwinkle-soft ring-brand-periwinkle/20",
  "bg-brand-purple-soft ring-brand-purple/10",
];

type AboutProps = {
  content: AboutContent;
  city: string | null;
  /** Sitio del colegio (panel → Redes). Sin él, no se muestra el enlace del final. */
  school: SchoolSite | null;
};

/**
 * «Quiénes somos» (plan §5.1). Sin foto real todavía, así que en lugar de
 * fotos de stock va una composición gráfica con la paleta y el símbolo, con
 * las cifras grandes. Si en el panel se carga `image_url`, la foto va arriba
 * de la baldosa morada, a lo ancho, con su descripción (image_alt). Sin
 * descripción (datos anteriores al campo) se trata como decorativa: alt="".
 */
export function About({ content, city, school }: AboutProps) {
  return (
    <section id="quienes-somos" aria-labelledby="quienes-somos-title" className="bg-[#fdf8ef] py-20 lg:py-28">
      <Container className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        <div>
          <SectionHeading id="quienes-somos-title" focusTarget eyebrow="Fundapresai" title={content.title} />
          <MarkdownContent variant="inline" className="mt-6 max-w-[38rem]">
            {content.body_md}
          </MarkdownContent>
          {school && (
            <p className="mt-8">
              <a
                href={school.href}
                rel="noopener"
                className="inline-block min-h-12 py-2 text-lg font-medium text-brand-purple underline decoration-2 underline-offset-[6px] hover:text-brand-purple-dark"
              >
                Conozca más sobre el colegio en{" "}
                {/* El ícono va pegado al dominio: si el texto se parte en dos líneas, no queda suelto al final. */}
                <span className="whitespace-nowrap">
                  {school.host}
                  <ExternalLink aria-hidden="true" className="ml-2 inline size-5 align-[-0.2em]" />
                </span>
              </a>
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {content.image_url && (
            <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-panel)] bg-brand-purple-soft shadow-soft sm:col-span-2">
              <Image
                src={content.image_url}
                alt={content.image_alt ?? ""}
                fill
                sizes="(min-width: 1280px) 600px, (min-width: 1024px) 45vw, 100vw"
                unoptimized={shouldSkipOptimization(content.image_url)}
                className="object-cover"
              />
            </div>
          )}

          {/* Baldosa principal: el colegio. */}
          <div className="relative isolate overflow-hidden rounded-[var(--radius-panel)] bg-[linear-gradient(140deg,#6d3896_0%,var(--color-brand-purple)_45%,#3f1c5a_100%)] p-7 text-white shadow-lifted sm:col-span-2 sm:p-8">
            <div aria-hidden="true" className="absolute -right-10 -top-6 -z-10 w-72 text-white/[0.09] sm:w-80">
              <LeafSymbol tone="mono" />
            </div>
            <div
              aria-hidden="true"
              className="absolute -bottom-24 -left-16 -z-10 size-64 rounded-full bg-brand-periwinkle/30 blur-3xl"
            />
            <span className="grid size-14 place-items-center rounded-2xl bg-white/95 shadow-soft">
              <LeafSymbol className="w-9" />
            </span>
            <p className="mt-10 text-sm font-semibold uppercase tracking-[0.12em] text-white/85">Nuestra obra</p>
            <p className="mt-1 text-2xl font-semibold leading-snug sm:text-3xl sm:leading-tight">
              Colegio de Valores Humanos Sathya Sai
            </p>
            {city && (
              <p className="mt-3 inline-flex items-center gap-2 text-white/90">
                <MapPin aria-hidden="true" className="size-5" />
                {city}
              </p>
            )}
          </div>

          {content.stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`rounded-[var(--radius-panel)] p-7 ring-1 sm:p-8 ${STAT_TILES[index % STAT_TILES.length]}`}
            >
              <p className="text-[3.25rem] font-semibold leading-none tracking-[-0.03em] text-brand-purple sm:text-6xl">
                {stat.value}
              </p>
              <p className="mt-3 text-ink">{stat.label}</p>
            </div>
          ))}

          {/* Valores: va a lo ancho si el número de cifras es par. */}
          <div
            className={`rounded-[var(--radius-panel)] bg-surface p-7 shadow-soft ring-1 ring-black/[0.05] sm:p-8 ${
              content.stats.length % 2 === 0 ? "sm:col-span-2" : ""
            }`}
          >
            <p className="text-lg font-semibold text-ink">Educación basada en valores humanos</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {VALUES.map((value) => (
                <li
                  key={value}
                  className="rounded-full bg-brand-purple-soft px-4 py-1.5 text-base font-medium text-brand-purple"
                >
                  {value}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
