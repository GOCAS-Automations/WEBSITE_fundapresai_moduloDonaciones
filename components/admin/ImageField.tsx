"use client";

/**
 * Campo de imagen reutilizable (portadas, hero, «Quiénes somos», redes).
 *
 * «Subir imagen»: la foto se reduce y comprime EN EL NAVEGADOR (~2000 px,
 * WebP) y se sube al bucket «media» con un nombre único y ordenado
 * (p. ej. campanas/<slug>-<timestamp>.webp), junto con sus variantes de 640,
 * 1080 y 1600 px (<…>-w640.webp, etc.; ver lib/image-variants.ts).
 * «Pegar enlace»: solo https; los enlaces de Google Drive se convierten a
 * vista directa; y se comprueba que la URL cargue una imagen antes de dejar
 * guardar (data-blocking bloquea el envío del formulario mientras tanto).
 */
import { CheckCircle2, ImageIcon, Link2, Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { normalizeImageUrl } from "@/lib/admin/drive";
import { humanizeError } from "@/lib/admin/errors";
import {
  formatBytes,
  IMAGE_ACCEPT,
  ImageProcessingError,
  probeImageUrl,
  processImage,
} from "@/lib/admin/image-processing";
import { variantPath } from "@/lib/image-variants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/validations";
import { inputClasses } from "./form";

type ImageFieldProps = {
  label: string;
  name: string;
  defaultValue?: string | null;
  hint?: string;
  error?: string;
  optional?: boolean;
  /** Carpeta del bucket: «campanas» o «sitio». */
  folder: "campanas" | "sitio";
  /** Base del nombre del archivo (p. ej. el slug de la campaña). */
  fileBaseName: string;
  /** Lado mayor en px (2000) y formato (WebP; JPEG para la imagen de redes). */
  maxSide?: number;
  format?: "webp" | "jpeg";
  /** Proporción de la vista previa (la del lugar donde se publica). */
  aspect?: "16/10" | "1200/630" | "4/3";
  onChange?: (url: string) => void;
};

type Tab = "subir" | "enlace";

type Status =
  | { kind: "idle" }
  | { kind: "working"; text: string }
  | { kind: "done"; text: string }
  | { kind: "error"; text: string };

const ASPECTS = { "16/10": "aspect-[16/10]", "1200/630": "aspect-[1200/630]", "4/3": "aspect-[4/3]" } as const;

function timestamp() {
  return Date.now().toString();
}

export function ImageField({
  label,
  name,
  defaultValue,
  hint,
  error,
  optional,
  folder,
  fileBaseName,
  maxSide = 2000,
  format = "webp",
  aspect = "16/10",
  onChange,
}: ImageFieldProps) {
  const id = useId();
  const [url, setUrl] = useState(defaultValue ?? "");
  const [preview, setPreview] = useState(defaultValue ?? "");
  const [tab, setTab] = useState<Tab>("subir");
  const [linkText, setLinkText] = useState("");
  const [linkState, setLinkState] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const checkSeq = useRef(0);
  const blobUrl = useRef<string | null>(null);
  const subirTabRef = useRef<HTMLButtonElement>(null);
  const enlaceTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => () => {
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
  }, []);

  function commit(next: string, previewSrc = next) {
    setUrl(next);
    setPreview(previewSrc);
    onChange?.(next);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setStatus({ kind: "working", text: "Preparando la foto…" });
    try {
      const processed = await processImage(file, { maxSide, format });
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
      blobUrl.current = URL.createObjectURL(processed.blob);
      setPreview(blobUrl.current);
      setStatus({ kind: "working", text: `Subiendo la foto (${formatBytes(processed.blob.size)})…` });

      const base = slugify(fileBaseName) || "imagen";
      const path = `${folder}/${base}-${timestamp()}.${processed.extension}`;
      const supabase = createSupabaseBrowserClient();
      // La imagen y sus variantes de 640, 1080 y 1600 px (el sitio las usa en el srcset).
      const files = [
        { path, blob: processed.blob },
        ...processed.variants.map((v) => ({ path: variantPath(path, v.width), blob: v.blob })),
      ];
      const results = await Promise.all(
        files.map((file) =>
          supabase.storage.from("media").upload(file.path, file.blob, {
            contentType: processed.contentType,
            cacheControl: "31536000",
            upsert: false,
          }),
        ),
      );
      const uploadError = results.find((r) => r.error)?.error;
      if (uploadError) {
        // Nada a medias: si falló alguna, se borran las que sí subieron.
        const done = files.filter((_, i) => !results[i].error).map((file) => file.path);
        if (done.length) await supabase.storage.from("media").remove(done);
        throw uploadError;
      }
      const publicUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      commit(publicUrl, blobUrl.current);
      setLinkText("");
      setLinkState("idle");
      setStatus({
        kind: "done",
        text: `Foto lista: ${processed.width} × ${processed.height} px, ${formatBytes(processed.blob.size)} (la original pesaba ${formatBytes(file.size)}). Recuerde tocar «Guardar».`,
      });
    } catch (err) {
      setPreview(url);
      const text = err instanceof ImageProcessingError ? err.message : humanizeError(err, "subir imagen");
      setStatus({ kind: "error", text });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function checkLink(text = linkText) {
    const seq = ++checkSeq.current;
    const normalized = normalizeImageUrl(text);
    if (!normalized.ok) {
      setLinkState("invalid");
      setStatus({ kind: "error", text: normalized.error });
      return;
    }
    setLinkState("checking");
    setStatus({ kind: "working", text: "Comprobando que el enlace muestre una imagen…" });
    try {
      const size = await probeImageUrl(normalized.url);
      if (seq !== checkSeq.current) return;
      setLinkState("valid");
      commit(normalized.url);
      setStatus({
        kind: "done",
        text:
          normalized.source === "drive"
            ? `La imagen de Google Drive carga bien (${size.width} × ${size.height} px). Recuerde tocar «Guardar».`
            : `La imagen carga bien (${size.width} × ${size.height} px). Recuerde tocar «Guardar».`,
      });
    } catch {
      if (seq !== checkSeq.current) return;
      setLinkState("invalid");
      setStatus({
        kind: "error",
        text:
          normalized.source === "drive"
            ? "Google Drive no deja mostrar esta imagen. Revise que esté compartida como «Cualquier persona con el enlace», o descárguela y use «Subir imagen» (es lo más seguro)."
            : "Ese enlace no muestra una imagen (puede ser una página o pedir iniciar sesión). Abra la imagen, copie su dirección directa, o descárguela y use «Subir imagen».",
      });
    }
  }

  function clear() {
    commit("", "");
    setLinkText("");
    setLinkState("idle");
    setStatus({ kind: "done", text: "Se quitó la imagen. Recuerde tocar «Guardar»." });
  }

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: Tab = tab === "subir" ? "enlace" : "subir";
    setTab(next);
    (next === "subir" ? subirTabRef : enlaceTabRef).current?.focus();
  };

  // Mientras sube o el enlace no está comprobado, el formulario no se envía.
  const blocking = uploading
    ? "Espere a que termine de subir la imagen y luego toque «Guardar»."
    : linkText.trim() && linkState !== "valid"
      ? {
          idle: "Toque «Usar este enlace» para comprobar la imagen antes de guardar.",
          checking: "Espere a que terminemos de comprobar el enlace de la imagen.",
          invalid: "El enlace de la imagen no funciona. Corríjalo, bórrelo o use «Subir imagen».",
        }[linkState]
      : undefined;

  const tabClass = (active: boolean) =>
    cn(
      "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition sm:px-4 sm:text-base",
      active ? "bg-surface text-brand-purple shadow-soft" : "text-ink-muted hover:text-ink",
    );

  const statusId = `${id}-estado`;

  return (
    <fieldset className="space-y-2" aria-describedby={[hint && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(" ") || undefined}>
      <legend className="text-lg font-semibold text-ink">
        {label}
        {optional && <span className="ml-2 text-base font-normal text-ink-muted">(opcional)</span>}
      </legend>
      {hint && (
        <p id={`${id}-ayuda`} className="text-base text-ink-muted">
          {hint}
        </p>
      )}
      <div data-blocking={blocking} className="space-y-4 pt-1">
        <input type="hidden" name={name} value={url} />

        {/* Vista previa */}
        <div className={cn("relative w-full overflow-hidden rounded-2xl bg-brand-purple-soft ring-1 ring-black/[0.06]", ASPECTS[aspect])}>
          {preview ? (
            <Image src={preview} alt="Vista previa de la imagen elegida" fill unoptimized sizes="640px" className="object-cover" />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-center text-ink-muted">
              <div>
                <ImageIcon aria-hidden="true" className="mx-auto size-10 text-brand-periwinkle-ink" />
                <p className="mt-2 text-base">Todavía no hay imagen</p>
              </div>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-sm">
              <Loader2 aria-hidden="true" className="size-10 animate-spin text-brand-purple" />
            </div>
          )}
        </div>

        {/* Pestañas */}
        <div role="tablist" aria-label={`${label}: cómo agregarla`} className="flex gap-1 rounded-2xl bg-neutral-bg p-1">
          <button
            ref={subirTabRef}
            type="button"
            role="tab"
            id={`${id}-tab-subir`}
            aria-selected={tab === "subir"}
            aria-controls={`${id}-panel-subir`}
            tabIndex={tab === "subir" ? 0 : -1}
            onClick={() => setTab("subir")}
            onKeyDown={onTabKey}
            className={tabClass(tab === "subir")}
          >
            <Upload aria-hidden="true" className="hidden size-5 sm:block" />
            Subir imagen
          </button>
          <button
            ref={enlaceTabRef}
            type="button"
            role="tab"
            id={`${id}-tab-enlace`}
            aria-selected={tab === "enlace"}
            aria-controls={`${id}-panel-enlace`}
            tabIndex={tab === "enlace" ? 0 : -1}
            onClick={() => setTab("enlace")}
            onKeyDown={onTabKey}
            className={tabClass(tab === "enlace")}
          >
            <Link2 aria-hidden="true" className="hidden size-5 sm:block" />
            Pegar enlace
          </button>
        </div>

        <div id={`${id}-panel-subir`} role="tabpanel" aria-labelledby={`${id}-tab-subir`} hidden={tab !== "subir"} className="space-y-3">
          <input
            ref={fileRef}
            id={`${id}-archivo`}
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-label={`${label}: elegir archivo`}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button
            data-field={name}
            variant="secondary"
            size="lg"
            fullWidth
            disabled={uploading}
            aria-describedby={[statusId, error && `${id}-error`].filter(Boolean).join(" ")}
            icon={uploading ? <Loader2 className="animate-spin" /> : <Upload />}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Subiendo…" : preview ? "Elegir otra foto" : "Elegir foto"}
          </Button>
          <p className="text-base text-ink-muted">
            Desde su computador o celular (JPG, PNG o WebP). No importa si pesa mucho: la reducimos automáticamente.
          </p>
        </div>

        <div id={`${id}-panel-enlace`} role="tabpanel" aria-labelledby={`${id}-tab-enlace`} hidden={tab !== "enlace"} className="space-y-3">
          <label htmlFor={`${id}-enlace`} className="block text-base font-semibold text-ink">
            Enlace de la imagen (empieza por https://)
          </label>
          <input
            id={`${id}-enlace`}
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://…"
            value={linkText}
            onChange={(e) => {
              setLinkText(e.target.value);
              setLinkState("idle");
              if (!e.target.value.trim()) setStatus({ kind: "idle" });
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              if (pasted) {
                e.preventDefault();
                setLinkText(pasted.trim());
                void checkLink(pasted);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void checkLink();
              }
            }}
            aria-describedby={statusId}
            aria-invalid={linkState === "invalid" ? true : undefined}
            className={inputClasses}
          />
          <Button
            variant="tinted"
            size="lg"
            fullWidth
            disabled={!linkText.trim() || linkState === "checking"}
            icon={linkState === "checking" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
            onClick={() => void checkLink()}
          >
            {linkState === "checking" ? "Comprobando…" : "Usar este enlace"}
          </Button>
          <p className="text-base text-ink-muted">
            Sirve un enlace de Google Drive compartido como «Cualquier persona con el enlace». Para fotos importantes es
            mejor «Subir imagen».
          </p>
        </div>

        <div id={statusId} role="status" aria-live="polite">
          {status.kind !== "idle" && (
            <p
              className={cn(
                "flex items-start gap-2 rounded-2xl px-4 py-3 text-base",
                status.kind === "error" && "bg-danger-bg font-medium text-danger-ink",
                status.kind === "done" && "bg-success-bg text-success-ink",
                status.kind === "working" && "bg-brand-periwinkle-soft text-ink",
              )}
            >
              {status.kind === "working" && <Loader2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 animate-spin" />}
              {status.text}
            </p>
          )}
        </div>

        {optional && url && (
          <Button variant="quiet" size="md" icon={<Trash2 />} onClick={clear} disabled={uploading}>
            Quitar imagen
          </Button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-base font-medium text-danger-ink">
          {error}
        </p>
      )}
    </fieldset>
  );
}
