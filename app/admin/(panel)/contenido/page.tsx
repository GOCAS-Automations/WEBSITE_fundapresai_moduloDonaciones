import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";

import {
  AboutForm,
  ContactForm,
  HelpForm,
  HeroForm,
  HowToDonateForm,
  PrivacyForm,
  SeoForm,
  SocialsForm,
} from "@/components/admin/SiteSettingsForms";
import { AdminContainer, Notice, PageHeader, Section } from "@/components/admin/ui";
import { humanizeError } from "@/lib/admin/errors";
import { getAdminContext } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Editar sitio" };

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Raw) : {});

const BLOCKS = [
  { id: "portada", title: "Portada", description: "Lo primero que se ve al entrar al sitio." },
  { id: "quienes-somos", title: "Quiénes somos", description: "La fundación, sus cifras y una foto." },
  { id: "como-donar", title: "Cómo donar", description: "Los 3 pasos para donar." },
  { id: "ayuda", title: "Ayuda para donar", description: "El bloque «¿Necesita ayuda para donar?»." },
  { id: "contacto", title: "Contacto", description: "Teléfono, WhatsApp, correo y dirección (se ven en el pie)." },
  { id: "redes", title: "Redes sociales", description: "Enlaces que aparecen en el pie del sitio." },
  { id: "buscadores", title: "Buscadores y redes", description: "Cómo aparece el sitio en Google y al compartirlo." },
  { id: "privacidad", title: "Política de privacidad", description: "El texto de la página de privacidad." },
] as const;

export default async function ContentPage() {
  const ctx = await getAdminContext();
  if (!ctx.ok) return null;

  const [{ data, error }, { data: active }] = await Promise.all([
    ctx.supabase
      .from("site_settings")
      .select("hero, about, how_to_donate, help, contact, socials, seo, privacy_md")
      .eq("id", 1)
      .maybeSingle(),
    // Para explicar si la imagen de la portada se está viendo (solo sin campañas activas).
    ctx.supabase
      .from("campaigns")
      .select("title, is_featured")
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);
  const activeCampaigns = active ?? [];
  const heroImageStatus = {
    activeCount: activeCampaigns.length,
    featuredTitle: (activeCampaigns.find((c) => c.is_featured) ?? activeCampaigns[0])?.title ?? null,
  };

  return (
    <AdminContainer>
      <PageHeader
        back={{ href: "/admin", label: "Inicio" }}
        title="Editar sitio"
        description="Cada bloque tiene su propio botón «Guardar». Los cambios se publican al instante."
      />

      {error || !data ? (
        <Notice tone="error" title="No pudimos cargar el contenido">
          {error ? humanizeError(error, "leer site_settings") : "Falta la fila de contenido del sitio. Avise a GOCAS."}
        </Notice>
      ) : (
        <>
          <nav aria-label="Bloques del sitio" className="mb-10">
            <ul className="divide-y divide-separator overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft ring-1 ring-black/[0.05]">
              {BLOCKS.map((block) => (
                <li key={block.id}>
                  <a
                    href={`#${block.id}`}
                    className="flex min-h-14 items-center gap-3 px-5 py-3 text-lg font-medium text-ink hover:bg-surface-muted"
                  >
                    <span className="flex-1">{block.title}</span>
                    <ChevronRight aria-hidden="true" className="size-6 text-ink-muted" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-12">
            <Section id="portada" title={BLOCKS[0].title} description={BLOCKS[0].description}>
              <HeroForm value={obj(data.hero)} imageStatus={heroImageStatus} />
            </Section>
            <Section id="quienes-somos" title={BLOCKS[1].title} description={BLOCKS[1].description}>
              <AboutForm value={obj(data.about)} />
            </Section>
            <Section id="como-donar" title={BLOCKS[2].title} description={BLOCKS[2].description}>
              <HowToDonateForm value={obj(data.how_to_donate)} />
            </Section>
            <Section id="ayuda" title={BLOCKS[3].title} description={BLOCKS[3].description}>
              <HelpForm value={obj(data.help)} />
            </Section>
            <Section id="contacto" title={BLOCKS[4].title} description={BLOCKS[4].description}>
              <ContactForm value={obj(data.contact)} />
            </Section>
            <Section id="redes" title={BLOCKS[5].title} description={BLOCKS[5].description}>
              <SocialsForm value={obj(data.socials)} />
            </Section>
            <Section id="buscadores" title={BLOCKS[6].title} description={BLOCKS[6].description}>
              <SeoForm value={obj(data.seo)} />
            </Section>
            <Section id="privacidad" title={BLOCKS[7].title} description={BLOCKS[7].description}>
              <PrivacyForm value={data.privacy_md} />
            </Section>
          </div>
        </>
      )}
    </AdminContainer>
  );
}
