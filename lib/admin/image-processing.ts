/**
 * Reduce y comprime una foto EN EL NAVEGADOR antes de subirla (plan §9).
 * Las fotos de celular pesan 3–12 MB y el bucket acepta máximo 5 MB: aquí se
 * llevan a ~2000 px de lado mayor en WebP (o JPEG si el navegador no sabe
 * crear WebP, p. ej. Safari antiguo), normalmente 200–600 KB.
 * Solo para componentes cliente.
 */

export class ImageProcessingError extends Error {}

/** Lo que acepta el selector de archivos (HEIC solo si el navegador lo sabe leer). */
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif";

const READABLE = /^image\/(jpeg|png|webp|avif|heic|heif|gif|bmp)$/;
const MAX_INPUT_BYTES = 40 * 1024 * 1024;
/** Margen bajo el límite de 5 MB del bucket. */
const MAX_OUTPUT_BYTES = 4.5 * 1024 * 1024;

export type ProcessedImage = {
  blob: Blob;
  contentType: "image/webp" | "image/jpeg";
  extension: "webp" | "jpg";
  width: number;
  height: number;
};

type Options = {
  /** Lado mayor en px (2000 por defecto; 1200 para la imagen de redes sociales). */
  maxSide?: number;
  /** "jpeg" para la imagen de redes: WhatsApp y Facebook la leen mejor. */
  format?: "webp" | "jpeg";
};

function isHeic(file: File) {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Se intenta con <img> abajo.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Dibuja reduciendo a la mitad por pasos: más nítido que un solo salto grande. */
function drawScaled(source: CanvasImageSource, sw: number, sh: number, tw: number, th: number, background?: string) {
  let current: CanvasImageSource = source;
  let cw = sw;
  let ch = sh;
  while (cw / 2 >= tw * 1.5 && ch / 2 >= th * 1.5) {
    const step = document.createElement("canvas");
    step.width = Math.round(cw / 2);
    step.height = Math.round(ch / 2);
    const sctx = step.getContext("2d")!;
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(current, 0, 0, step.width, step.height);
    current = step;
    cw = step.width;
    ch = step.height;
  }
  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageProcessingError("Su navegador no pudo preparar la imagen. Pruebe con otro navegador.");
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, tw, th);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(current, 0, 0, tw, th);
  return canvas;
}

export async function processImage(file: File, { maxSide = 2000, format = "webp" }: Options = {}): Promise<ProcessedImage> {
  const looksLikeImage = READABLE.test(file.type) || isHeic(file) || (!file.type && /\.(jpe?g|png|webp|avif)$/i.test(file.name));
  if (!looksLikeImage) {
    throw new ImageProcessingError("Ese archivo no es una foto. Elija una imagen JPG, PNG o WebP.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageProcessingError("La foto es demasiado grande (más de 40 MB). Pruebe con otra.");
  }

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    throw new ImageProcessingError(
      isHeic(file)
        ? "Este navegador no puede leer fotos HEIC del iPhone. Súbala desde el mismo iPhone (Safari la convierte sola) o envíesela por WhatsApp y use esa copia."
        : "No pudimos leer esa imagen. Pruebe con otra foto (JPG o PNG).",
    );
  }

  const sw = "naturalWidth" in source ? source.naturalWidth : source.width;
  const sh = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (!sw || !sh) throw new ImageProcessingError("No pudimos leer esa imagen. Pruebe con otra foto.");

  let side = maxSide;
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const scale = Math.min(1, side / Math.max(sw, sh));
      const tw = Math.max(1, Math.round(sw * scale));
      const th = Math.max(1, Math.round(sh * scale));

      if (format === "webp") {
        const canvas = drawScaled(source, sw, sh, tw, th);
        for (const quality of [0.82, 0.7]) {
          const blob = await toBlob(canvas, "image/webp", quality);
          // Safari antiguo devuelve PNG si no sabe crear WebP: se pasa a JPEG.
          if (!blob || blob.type !== "image/webp") break;
          if (blob.size <= MAX_OUTPUT_BYTES) {
            return { blob, contentType: "image/webp", extension: "webp", width: tw, height: th };
          }
        }
      }
      // JPEG no tiene transparencia: fondo blanco (los PNG con fondo transparente no quedan negros).
      const canvas = drawScaled(source, sw, sh, tw, th, "#ffffff");
      for (const quality of [0.85, 0.72]) {
        const blob = await toBlob(canvas, "image/jpeg", quality);
        if (blob && blob.size <= MAX_OUTPUT_BYTES) {
          return { blob, contentType: "image/jpeg", extension: "jpg", width: tw, height: th };
        }
      }
      side = Math.round(side * 0.75);
    }
  } finally {
    if ("close" in source) source.close();
  }
  throw new ImageProcessingError("No pudimos reducir la foto lo suficiente. Pruebe con otra.");
}

/** Tamaño legible: «1,8 MB», «420 KB». */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toLocaleString("es-CO", { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Comprueba en el navegador que una URL carga una imagen de verdad (no una
 * página de inicio de sesión ni un error). Devuelve sus dimensiones.
 */
export function probeImageUrl(url: string, timeoutMs = 15000): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.referrerPolicy = "strict-origin-when-cross-origin";
    const timer = setTimeout(() => {
      img.src = "";
      reject(new Error("timeout"));
    }, timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      if (img.naturalWidth > 0 && img.naturalHeight > 0) resolve({ width: img.naturalWidth, height: img.naturalHeight });
      else reject(new Error("empty"));
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error("error"));
    };
    img.src = url;
  });
}
