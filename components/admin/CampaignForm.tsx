"use client";

/**
 * Crear y editar una campaña (todos los campos del plan §4).
 * - La dirección (slug) se arma sola desde el título al crear, y se puede editar.
 * - Contadores en título y resumen; editor Markdown con vista previa.
 * - donation_url: solo https; advierte (sin bloquear) si no es de Donar Online.
 */
import { AlertTriangle, ChevronRight, ExternalLink, Save, Star } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";

import { saveCampaign } from "@/app/admin/(panel)/campanas/actions";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { getSiteUrl } from "@/lib/env";
import {
  CAMPAIGN_STATUS_LABELS,
  donationUrlWarning,
  isHttpsUrl,
  slugify,
  type CampaignStatus,
} from "@/lib/validations";
import { FormMessage, SubmitButton, TextField, useAdminForm } from "./form";
import { ImageField } from "./ImageField";
import { MarkdownEditor } from "./MarkdownEditor";
import { Notice, Section } from "./ui";

export type CampaignFormValues = {
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
  progress_label: string | null;
  status: CampaignStatus;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
};

const STATUS_HELP: Record<CampaignStatus, string> = {
  active: "Se ve en el sitio.",
  draft: "Guardada para seguir después. No se ve en el sitio.",
  hidden: "Se quitó del sitio por un tiempo. No se ve.",
};

type CampaignFormProps = {
  campaign?: CampaignFormValues;
  /** Título de la campaña destacada actual (si es otra), para avisar que se reemplaza. */
  currentFeaturedTitle?: string | null;
};

export function CampaignForm({ campaign, currentFeaturedTitle }: CampaignFormProps) {
  const isNew = !campaign;
  const action = useMemo(() => saveCampaign.bind(null, campaign?.id ?? null), [campaign?.id]);
  const { state, fieldErrors: e, pending, formRef, onSubmit } = useAdminForm(action);

  const [title, setTitle] = useState(campaign?.title ?? "");
  const [slug, setSlug] = useState(campaign?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [donationUrl, setDonationUrl] = useState(campaign?.donation_url ?? "");
  const [status, setStatus] = useState<CampaignStatus>(campaign?.status ?? "draft");
  const [featured, setFeatured] = useState(campaign?.is_featured ?? false);
  const statusId = useId();

  const effectiveSlug = slugTouched ? slug : slugify(title);
  const donationOk = isHttpsUrl(donationUrl.trim());
  const donationWarning = donationOk ? donationUrlWarning(donationUrl.trim()) : null;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-10">
      <Section title="Lo básico">
        <div className="space-y-7">
          <TextField
            label="Título"
            name="title"
            max={70}
            value={title}
            onChange={(ev) => setTitle(ev.target.value)}
            error={e.title}
            hint="Corto y claro. Ejemplo: Unidos por su Educación"
          />
          <TextField
            label="Dirección de la página"
            name="slug"
            max={80}
            value={effectiveSlug}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            onChange={(ev) => {
              setSlugTouched(true);
              setSlug(ev.target.value.toLowerCase().replace(/\s+/g, "-"));
            }}
            error={e.slug}
            hint={
              <>
                Se arma sola con el título: solo minúsculas sin tildes, números y guiones.
                {!isNew && " Si la cambia, el enlace anterior dejará de funcionar."} Quedará así:
                <span className="mt-1 block font-medium text-ink [overflow-wrap:anywhere]">
                  {getSiteUrl().replace(/^https?:\/\//, "")}/campanas/{effectiveSlug || "…"}
                </span>
              </>
            }
          />
          <TextField
            label="Etiqueta"
            name="tag"
            optional
            max={40}
            defaultValue={campaign?.tag ?? ""}
            error={e.tag}
            hint="Palabra corta que se ve sobre la tarjeta. Ejemplo: Becas"
          />
          <TextField
            label="Resumen"
            name="summary"
            multiline
            rows={4}
            max={160}
            defaultValue={campaign?.summary ?? ""}
            error={e.summary}
            hint="Una o dos frases que invitan a donar. Se ve en la tarjeta de la campaña."
          />
        </div>
      </Section>

      <Section title="Imagen de portada">
        <div className="space-y-7">
          <ImageField
            label="Portada"
            name="cover_image_url"
            folder="campanas"
            fileBaseName={effectiveSlug || "campana"}
            defaultValue={campaign?.cover_image_url}
            error={e.cover_image_url}
            hint="Foto horizontal. Se recorta en formato 16:10, como se ve abajo."
          />
          <TextField
            label="Descripción de la imagen"
            name="cover_image_alt"
            multiline
            rows={2}
            max={200}
            defaultValue={campaign?.cover_image_alt ?? ""}
            error={e.cover_image_alt}
            hint="Para personas que no pueden ver la foto. Diga qué se ve. Ejemplo: Niños del colegio leyendo en el salón."
          />
        </div>
      </Section>

      <Section title="Contenido de la campaña">
        <MarkdownEditor
          label="Texto completo"
          name="body_md"
          optional
          max={20000}
          defaultValue={campaign?.body_md ?? ""}
          error={e.body_md}
          hint="Cuente la historia: a quién ayuda, en qué se usa el dinero y por qué es importante."
        />
      </Section>

      <Section title="Donación">
        <div className="space-y-7">
          <div className="space-y-3">
            <TextField
              label="Enlace de Donar Online"
              name="donation_url"
              type="url"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://donaronline.org/…"
              value={donationUrl}
              onChange={(ev) => setDonationUrl(ev.target.value)}
              error={e.donation_url}
              hint="Copie el enlace de la campaña en Donar Online. Debe empezar por https://"
            />
            {donationWarning && (
              <p role="status" className="flex gap-2 rounded-2xl bg-warning-bg px-4 py-3 text-base text-warning-ink">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                {donationWarning}
              </p>
            )}
            {donationOk ? (
              <a
                href={donationUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: "tinted", size: "lg", className: "w-full sm:w-auto" })}
              >
                <ExternalLink aria-hidden="true" className="size-6" />
                Probar enlace de donación
                <span className="sr-only"> (se abre en otra pestaña)</span>
              </a>
            ) : (
              <p className="text-base text-ink-muted">
                Cuando escriba un enlace válido aparecerá el botón «Probar enlace de donación».
              </p>
            )}
          </div>
          <TextField
            label="Nota sobre la donación"
            name="donation_note"
            optional
            max={200}
            defaultValue={campaign?.donation_note ?? ""}
            error={e.donation_note}
            hint="Ejemplo: Aporte mensual sugerido desde $120.000"
          />
          <div className="space-y-5">
            <TextField
              label="Avance de la meta (%)"
              name="progress_percent"
              optional
              inputMode="numeric"
              autoComplete="off"
              defaultValue={campaign?.progress_percent?.toString() ?? ""}
              error={e.progress_percent}
              hint="Número del 0 al 100. Si lo deja vacío, no se muestra la barra de avance."
              className="sm:max-w-xs"
            />
            <TextField
              label="Texto del avance"
              name="progress_label"
              optional
              max={60}
              autoComplete="off"
              defaultValue={campaign?.progress_label ?? ""}
              error={e.progress_label}
              hint="Va junto al porcentaje y dice qué mide. Ejemplo: de las becas ya están cubiertas. Si lo deja vacío, se muestra «de la meta»."
            />
            <Notice tone="info">
              <strong className="font-semibold">Este dato no se actualiza solo:</strong> cámbielo cuando la fundación
              tenga una cifra nueva.
            </Notice>
          </div>
        </div>
      </Section>

      <Section title="Publicación">
        <div className="space-y-7">
          <fieldset aria-describedby={e.status ? `${statusId}-error` : undefined}>
            <legend className="text-lg font-semibold text-ink">Estado</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {(["active", "draft", "hidden"] as const).map((value) => (
                <label
                  key={value}
                  className={cn(
                    "flex min-h-14 cursor-pointer gap-3 rounded-2xl border-2 p-4 transition",
                    status === value ? "border-brand-purple bg-brand-purple-soft" : "border-separator hover:border-[#cfc8d6]",
                  )}
                >
                  <input
                    type="radio"
                    name="status"
                    value={value}
                    checked={status === value}
                    onChange={() => setStatus(value)}
                    className="mt-1 size-6 shrink-0 accent-brand-purple"
                    {...(value === "active" ? { "data-field": "status" } : {})}
                  />
                  <span>
                    <span className="block text-lg font-semibold text-ink">{CAMPAIGN_STATUS_LABELS[value]}</span>
                    <span className="block text-base text-ink-muted">{STATUS_HELP[value]}</span>
                  </span>
                </label>
              ))}
            </div>
            {e.status && (
              <p id={`${statusId}-error`} className="mt-2 text-base font-medium text-danger-ink">
                {e.status}
              </p>
            )}
          </fieldset>

          <div>
            <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border-2 border-separator p-4 hover:border-[#cfc8d6]">
              <input
                type="checkbox"
                name="is_featured"
                checked={featured}
                onChange={(ev) => setFeatured(ev.target.checked)}
                aria-describedby={`${statusId}-destacada`}
                className="mt-1 size-6 shrink-0 accent-brand-purple"
              />
              <span>
                <span className="flex items-center gap-2 text-lg font-semibold text-ink">
                  <Star aria-hidden="true" className="size-5 fill-brand-orange text-brand-orange" />
                  Campaña destacada
                </span>
                <span id={`${statusId}-destacada`} className="block text-base text-ink-muted">
                  Aparece grande en la portada del sitio. Solo puede haber una
                  {currentFeaturedTitle && !campaign?.is_featured
                    ? `: si marca esta, «${currentFeaturedTitle}» deja de ser la destacada.`
                    : "."}
                </span>
              </span>
            </label>
          </div>
        </div>
      </Section>

      <Section title="Buscadores (opcional)">
        <details className="group">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-xl text-lg font-semibold text-brand-purple">
            <ChevronRight aria-hidden="true" className="size-6 transition group-open:rotate-90" />
            Cambiar cómo aparece en Google
          </summary>
          <div className="mt-5 space-y-7">
            <p className="text-base text-ink-muted">Si los deja vacíos se usan el título y el resumen.</p>
            <TextField
              label="Título para Google"
              name="seo_title"
              optional
              max={70}
              defaultValue={campaign?.seo_title ?? ""}
              error={e.seo_title}
            />
            <TextField
              label="Descripción para Google"
              name="seo_description"
              optional
              multiline
              rows={3}
              max={170}
              defaultValue={campaign?.seo_description ?? ""}
              error={e.seo_description}
            />
          </div>
        </details>
      </Section>

      <div className="space-y-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-soft ring-1 ring-black/[0.05] sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SubmitButton pending={pending} icon={<Save />}>
            {isNew ? "Crear campaña" : "Guardar cambios"}
          </SubmitButton>
          <Link
            href="/admin/campanas"
            className={buttonClasses({ variant: "secondary", size: "lg", className: "w-full sm:w-auto" })}
          >
            {isNew ? "Cancelar" : "Volver a campañas"}
          </Link>
        </div>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
