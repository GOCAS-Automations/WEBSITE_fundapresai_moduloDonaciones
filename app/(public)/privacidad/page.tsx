import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { LeafSymbol } from "@/components/brand/LeafSymbol";
import { MarkdownContent } from "@/components/content/MarkdownContent";
import { BackLink } from "@/components/ui/BackLink";
import { Container } from "@/components/ui/Container";
import { getSiteSettings } from "@/lib/content";
import { buildMetadata, ORGANIZATION_NAME } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Política de privacidad",
  description:
    "Cómo trata la Fundación Fundapresai su información: este sitio no recoge datos personales ni de pago, y las donaciones se procesan en Donar Online.",
  path: "/privacidad",
});

/**
 * Política de privacidad (plan §5.4). El texto es editable en el panel
 * («Editar sitio» → «Política de privacidad», campo privacy_md) y usa la
 * misma tipografía de lectura que el detalle de campaña. Página estática.
 */
export default async function PrivacyPage() {
  const settings = await getSiteSettings();
  const text = settings?.privacyMd.trim() ?? "";

  return (
    <main id="contenido">
      <div className="relative isolate -mt-[4.5rem] lg:-mt-20">
        <div aria-hidden="true" className="bg-hero-mesh pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] overflow-hidden">
          <LeafSymbol tone="soft" className="absolute -right-28 top-16 w-[22rem] opacity-70 sm:w-[28rem] lg:right-[4%] lg:top-20 lg:w-[34rem] lg:opacity-90" />
        </div>

        <Container
          width="narrow"
          className="pb-20 pt-[calc(4.5rem+1.25rem)] sm:pt-[calc(4.5rem+2rem)] lg:pb-28 lg:pt-[calc(5rem+2.25rem)]"
        >
          <BackLink href="/">Volver al inicio</BackLink>

          <header className="mt-10 sm:mt-12">
            <p className="inline-flex items-center gap-2.5 rounded-full bg-white/80 py-1.5 pl-2 pr-4 text-base font-semibold text-brand-purple-dark shadow-soft ring-1 ring-black/[0.05] backdrop-blur">
              <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-brand-purple-soft text-brand-purple">
                <ShieldCheck className="size-5" />
              </span>
              {ORGANIZATION_NAME}
            </p>
            <h1 className="mt-6 text-[2.25rem] leading-[1.1] tracking-[-0.025em] sm:text-5xl sm:leading-[1.08]">
              Política de privacidad
            </h1>
          </header>

          <div className="-mx-5 mt-10 bg-surface px-5 py-10 sm:mx-0 sm:rounded-[var(--radius-panel)] sm:px-10 sm:py-12 sm:shadow-soft sm:ring-1 sm:ring-black/[0.05] lg:px-14 lg:py-14">
            {text ? (
              <MarkdownContent>{text}</MarkdownContent>
            ) : (
              <p className="text-lg">
                Estamos preparando este texto. Si tiene preguntas sobre cómo tratamos su información, escríbanos con los
                datos de contacto que aparecen al final de la página.
              </p>
            )}
          </div>
        </Container>
      </div>
    </main>
  );
}
