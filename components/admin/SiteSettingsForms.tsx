"use client";

/**
 * Formularios de «Editar sitio»: uno por bloque de site_settings, cada uno
 * con su botón Guardar y su mensaje (aria-live). Los campos no controlados
 * conservan lo escrito después de guardar o de un error.
 */
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";

import { saveSiteBlock, type SiteBlockKey } from "@/app/admin/(panel)/contenido/actions";
import { Button } from "@/components/ui/Button";
import { FormFooter, TextField, useAdminForm } from "./form";
import { ImageField } from "./ImageField";
import { MarkdownEditor } from "./MarkdownEditor";
import { Notice } from "./ui";

type Raw = Record<string, unknown>;
type Errors = Record<string, string>;

const str = (v: unknown) => (typeof v === "string" ? v : "");
const list = (v: unknown): Raw[] => (Array.isArray(v) ? v.filter((x): x is Raw => typeof x === "object" && x !== null) : []);

function BlockForm({
  block,
  saveLabel,
  children,
}: {
  block: SiteBlockKey;
  saveLabel: string;
  children: (errors: Errors) => ReactNode;
}) {
  const action = useMemo(() => saveSiteBlock.bind(null, block), [block]);
  const { state, fieldErrors, pending, formRef, onSubmit } = useAdminForm(action);
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate>
      <div className="space-y-7">{children(fieldErrors)}</div>
      <FormFooter state={state} pending={pending} label={saveLabel} />
    </form>
  );
}

/** Descripción de la imagen de un bloque (obligatoria si hay imagen). */
function ImageAltField({ value, error }: { value: unknown; error?: string }) {
  return (
    <TextField
      label="Descripción de la imagen"
      name="image_alt"
      optional
      multiline
      rows={2}
      max={200}
      defaultValue={str(value)}
      error={error}
      hint="Obligatoria si agrega una imagen: la leen las personas que no pueden verla. Diga qué se ve. Ejemplo: Niños del colegio en el patio, sonriendo."
    />
  );
}

/** Estado de la portada: ¿se está viendo la imagen del hero o la campaña destacada? */
export type HeroImageStatus = { activeCount: number; featuredTitle: string | null };

function HeroImageNotice({ status }: { status: HeroImageStatus }) {
  const showing = status.activeCount === 0;
  return (
    <Notice tone={showing ? "success" : "info"} title="Se muestra solo si no hay una campaña destacada">
      <p>
        La portada del sitio muestra la campaña destacada con su foto. Esta imagen aparece en su lugar solo cuando no
        hay ninguna campaña activa.
      </p>
      <p className="mt-2 font-semibold">
        {showing
          ? "Hoy no hay campañas activas: esta imagen SÍ se está mostrando."
          : `Hoy hay ${status.activeCount} ${status.activeCount === 1 ? "campaña activa" : "campañas activas"}: esta imagen NO se está mostrando${
              status.featuredTitle ? ` (se ve «${status.featuredTitle}»)` : ""
            }.`}
      </p>
    </Notice>
  );
}

export function HeroForm({ value, imageStatus }: { value: Raw; imageStatus: HeroImageStatus }) {
  return (
    <BlockForm block="hero" saveLabel="Guardar portada">
      {(e) => (
        <>
          <TextField
            label="Texto pequeño superior"
            name="eyebrow"
            optional
            max={60}
            defaultValue={str(value.eyebrow)}
            error={e.eyebrow}
            hint="Va arriba del título, dentro de una píldora."
          />
          <TextField
            label="Título principal"
            name="title"
            multiline
            rows={2}
            max={120}
            defaultValue={str(value.title)}
            error={e.title}
            hint="Si escribe dos frases, la segunda se pinta en morado."
          />
          <TextField label="Subtítulo" name="subtitle" multiline rows={4} max={280} defaultValue={str(value.subtitle)} error={e.subtitle} />
          <TextField
            label="Texto del botón principal"
            name="primary_cta_label"
            max={30}
            defaultValue={str(value.primary_cta_label)}
            error={e.primary_cta_label}
            hint="Lleva a donar a la campaña destacada."
          />
          <TextField
            label="Texto del botón secundario"
            name="secondary_cta_label"
            max={30}
            defaultValue={str(value.secondary_cta_label)}
            error={e.secondary_cta_label}
            hint="Baja hasta la lista de campañas."
          />
          <HeroImageNotice status={imageStatus} />
          <ImageField
            label="Imagen de la portada (de respaldo)"
            name="image_url"
            optional
            folder="sitio"
            fileBaseName="portada"
            aspect="4/3"
            defaultValue={str(value.image_url) || null}
            error={e.image_url}
            hint="Se muestra solo si no hay una campaña destacada (ninguna campaña activa)."
          />
          <ImageAltField value={value.image_alt} error={e.image_alt} />
        </>
      )}
    </BlockForm>
  );
}

const MAX_STATS = 4;

export function AboutForm({ value }: { value: Raw }) {
  const initial = list(value.stats);
  const nextKey = useRef(initial.length);
  const [rows, setRows] = useState(() => initial.map((stat, i) => ({ key: i, value: str(stat.value), label: str(stat.label) })));

  return (
    <BlockForm block="about" saveLabel="Guardar «Quiénes somos»">
      {(e) => (
        <>
          <TextField label="Título" name="title" max={80} defaultValue={str(value.title)} error={e.title} />
          <MarkdownEditor
            label="Texto"
            name="body_md"
            variant="inline"
            rows={10}
            max={5000}
            defaultValue={str(value.body_md)}
            error={e.body_md}
          />
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-ink">Cifras destacadas</legend>
            <p className="text-base text-ink-muted">
              Hasta {MAX_STATS}. Ejemplo: cifra «108» y descripción «niños y niñas estudian gratis en el colegio».
            </p>
            {e.stats && <p className="text-base font-medium text-danger-ink">{e.stats}</p>}
            {rows.map((row, i) => (
              <div key={row.key} className="rounded-2xl bg-surface-muted p-4 ring-1 ring-black/[0.04] sm:p-5">
                <p className="mb-3 text-base font-semibold text-ink-muted">Cifra {i + 1}</p>
                <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                  <TextField
                    label="Cifra"
                    name={`stats.${i}.value`}
                    max={12}
                    defaultValue={row.value}
                    error={e[`stats.${i}.value`]}
                  />
                  <TextField
                    label="Descripción"
                    multiline
                    rows={2}
                    name={`stats.${i}.label`}
                    max={80}
                    defaultValue={row.label}
                    error={e[`stats.${i}.label`]}
                  />
                </div>
                <Button
                  variant="quiet"
                  className="mt-3"
                  icon={<Trash2 />}
                  onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
                >
                  Quitar cifra {i + 1}
                </Button>
              </div>
            ))}
            {rows.length < MAX_STATS && (
              <Button
                variant="tinted"
                icon={<Plus />}
                onClick={() => setRows((r) => [...r, { key: nextKey.current++, value: "", label: "" }])}
              >
                Agregar cifra
              </Button>
            )}
          </fieldset>
          <ImageField
            label="Foto de «Quiénes somos»"
            name="image_url"
            optional
            folder="sitio"
            fileBaseName="quienes-somos"
            defaultValue={str(value.image_url) || null}
            error={e.image_url}
            hint="Aparece a lo ancho, encima de la tarjeta morada del colegio."
          />
          <ImageAltField value={value.image_alt} error={e.image_alt} />
        </>
      )}
    </BlockForm>
  );
}

export function HowToDonateForm({ value }: { value: Raw }) {
  const steps = list(value.steps);
  return (
    <BlockForm block="how_to_donate" saveLabel="Guardar «Cómo donar»">
      {(e) => (
        <>
          <TextField label="Título" name="title" max={80} defaultValue={str(value.title)} error={e.title} />
          {e.steps && <p className="text-base font-medium text-danger-ink">{e.steps}</p>}
          {[0, 1, 2].map((i) => (
            <fieldset key={i} className="space-y-4 rounded-2xl bg-surface-muted p-4 ring-1 ring-black/[0.04] sm:p-5">
              <legend className="sr-only">Paso {i + 1}</legend>
              <p aria-hidden="true" className="text-base font-semibold text-ink-muted">
                Paso {i + 1}
              </p>
              <TextField
                label={`Título del paso ${i + 1}`}
                name={`steps.${i}.title`}
                max={60}
                defaultValue={str(steps[i]?.title)}
                error={e[`steps.${i}.title`]}
              />
              <TextField
                label={`Texto del paso ${i + 1}`}
                name={`steps.${i}.text`}
                multiline
                rows={3}
                max={200}
                defaultValue={str(steps[i]?.text)}
                error={e[`steps.${i}.text`]}
              />
            </fieldset>
          ))}
        </>
      )}
    </BlockForm>
  );
}

export function HelpForm({ value }: { value: Raw }) {
  return (
    <BlockForm block="help" saveLabel="Guardar «Ayuda»">
      {(e) => (
        <>
          <TextField label="Título" name="title" max={80} defaultValue={str(value.title)} error={e.title} />
          <TextField label="Texto" name="text" multiline rows={4} max={300} defaultValue={str(value.text)} error={e.text} />
          <TextField
            label="Texto del botón de WhatsApp"
            name="whatsapp_label"
            max={40}
            defaultValue={str(value.whatsapp_label)}
            error={e.whatsapp_label}
            hint="El número de WhatsApp se cambia en «Contacto»."
          />
        </>
      )}
    </BlockForm>
  );
}

export function ContactForm({ value }: { value: Raw }) {
  return (
    <BlockForm block="contact" saveLabel="Guardar contacto">
      {(e) => (
        <>
          <TextField
            label="Teléfono"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            optional
            defaultValue={str(value.phone)}
            error={e.phone}
            hint="Ejemplo: 315 878 0973"
          />
          <TextField
            label="WhatsApp"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            optional
            defaultValue={str(value.whatsapp)}
            error={e.whatsapp}
            hint="El número donde reciben mensajes. Ejemplo: 320 878 4968"
          />
          <TextField
            label="Correo"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            optional
            defaultValue={str(value.email)}
            error={e.email}
          />
          <TextField label="Dirección" name="address" optional max={160} defaultValue={str(value.address)} error={e.address} />
          <TextField label="Ciudad" name="city" optional max={80} defaultValue={str(value.city)} error={e.city} />
          <TextField
            label="Horario de atención"
            name="hours"
            optional
            max={120}
            defaultValue={str(value.hours)}
            error={e.hours}
            hint="Ejemplo: lunes a viernes, 7:00 a. m. a 3:00 p. m."
          />
        </>
      )}
    </BlockForm>
  );
}

const SOCIALS = [
  { name: "facebook", label: "Facebook" },
  { name: "instagram", label: "Instagram" },
  { name: "youtube", label: "YouTube" },
  { name: "website", label: "Página web del colegio" },
] as const;

export function SocialsForm({ value }: { value: Raw }) {
  return (
    <BlockForm block="socials" saveLabel="Guardar redes">
      {(e) => (
        <>
          <p className="text-base text-ink-muted">
            Copie la dirección completa de cada página (empieza por https://). Deje vacío lo que no tengan.
          </p>
          {SOCIALS.map((social) => (
            <TextField
              key={social.name}
              label={social.label}
              name={social.name}
              type="url"
              inputMode="url"
              autoComplete="off"
              optional
              placeholder="https://"
              defaultValue={str(value[social.name])}
              error={e[social.name]}
            />
          ))}
        </>
      )}
    </BlockForm>
  );
}

export function SeoForm({ value }: { value: Raw }) {
  return (
    <BlockForm block="seo" saveLabel="Guardar buscadores">
      {(e) => (
        <>
          <TextField
            label="Título para Google"
            name="title"
            max={70}
            defaultValue={str(value.title)}
            error={e.title}
            hint="Es el título azul que aparece en Google y en la pestaña del navegador."
          />
          <TextField
            label="Descripción para Google"
            name="description"
            multiline
            rows={3}
            max={170}
            defaultValue={str(value.description)}
            error={e.description}
            hint="Una o dos frases que expliquen el sitio."
          />
          <ImageField
            label="Imagen al compartir el enlace"
            name="og_image_url"
            optional
            folder="sitio"
            fileBaseName="redes"
            format="jpeg"
            maxSide={1200}
            aspect="1200/630"
            defaultValue={str(value.og_image_url) || null}
            error={e.og_image_url}
            hint="La que aparece al compartir el sitio por WhatsApp o Facebook. Ideal horizontal."
          />
        </>
      )}
    </BlockForm>
  );
}

export function PrivacyForm({ value }: { value: string }) {
  return (
    <BlockForm block="privacy" saveLabel="Guardar privacidad">
      {(e) => (
        <MarkdownEditor
          label="Texto de la política de privacidad"
          name="privacy_md"
          rows={16}
          max={50000}
          defaultValue={value}
          error={e.privacy_md}
          optional
        />
      )}
    </BlockForm>
  );
}
