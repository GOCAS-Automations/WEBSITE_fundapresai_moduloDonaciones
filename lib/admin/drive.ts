/**
 * Enlaces de imagen pegados en el panel (plan §9).
 *
 * Google Drive — probado el 2026-10-07 con Chrome y archivos públicos:
 * - `drive.google.com/uc?export=view&id=…` y `drive.usercontent.google.com/download?…`
 *   ya NO sirven dentro de una página: con `Sec-Fetch-Dest: image` Google
 *   responde 403 en HTML y Chrome lo bloquea (ERR_BLOCKED_BY_ORB).
 * - `lh3.googleusercontent.com/d/<id>=w2000` (a donde redirige
 *   `drive.google.com/thumbnail?id=…`) SÍ carga como imagen, siempre que el
 *   archivo esté compartido como «Cualquier persona con el enlace». Google lo
 *   limita (429) ante muchas peticiones seguidas, así que para fotos
 *   importantes es mejor «Subir imagen».
 * Por eso los enlaces de Drive se convierten al formato lh3 y, como cualquier
 * otro enlace, el panel comprueba que cargue una imagen antes de guardar.
 */

const DRIVE_HOSTS = new Set(["drive.google.com", "docs.google.com"]);
const DRIVE_ID = /^[A-Za-z0-9_-]{20,}$/;

/** Ancho que se pide a Google (lado mayor de las fotos del sitio). */
const DRIVE_WIDTH = 2000;

export type NormalizedImageUrl =
  | { ok: true; url: string; source: "drive" | "web" }
  | { ok: false; error: string };

/** Extrae el id de un enlace de Drive (`/file/d/<id>/…`, `open?id=`, `uc?id=`, `thumbnail?id=`). */
export function driveFileId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host === "lh3.googleusercontent.com") {
    const m = url.pathname.match(/^\/d\/([A-Za-z0-9_-]+)/);
    return m && DRIVE_ID.test(m[1]) ? m[1] : null;
  }
  if (!DRIVE_HOSTS.has(host) && host !== "drive.usercontent.google.com") return null;
  const fromPath = url.pathname.match(/\/(?:file\/)?d\/([A-Za-z0-9_-]+)/);
  const id = fromPath?.[1] ?? url.searchParams.get("id");
  return id && DRIVE_ID.test(id) ? id : null;
}

export function isGoogleDriveUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return DRIVE_HOSTS.has(host) || host === "drive.usercontent.google.com";
}

/**
 * Limpia y valida un enlace de imagen. Solo https. Los de Google Drive se
 * convierten a vista directa; si es de Drive pero no trae un archivo (p. ej.
 * una carpeta), se avisa que no sirve.
 */
export function normalizeImageUrl(input: string): NormalizedImageUrl {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Pegue el enlace de la imagen." };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "Eso no parece un enlace. Debe empezar por https://" };
  }
  if (url.protocol !== "https:") {
    return { ok: false, error: "El enlace debe empezar por https:// (los enlaces http:// no son seguros)." };
  }

  const id = driveFileId(url);
  if (id) return { ok: true, url: `https://lh3.googleusercontent.com/d/${id}=w${DRIVE_WIDTH}`, source: "drive" };
  if (isGoogleDriveUrl(url)) {
    return {
      ok: false,
      error:
        "Ese enlace de Google Drive no es de una imagen (puede ser una carpeta). Abra la foto en Drive, toque «Compartir» → «Copiar enlace» y péguelo aquí.",
    };
  }
  if (url.hostname.toLowerCase() === "photos.app.goo.gl" || url.hostname.toLowerCase() === "photos.google.com") {
    return {
      ok: false,
      error:
        "Los enlaces de Google Fotos no sirven para mostrar la imagen en el sitio. Descargue la foto y use «Subir imagen».",
    };
  }
  return { ok: true, url: url.toString(), source: "web" };
}
