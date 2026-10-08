import { getCampaignBySlug } from "@/lib/content";
import { getBrandOgImage, getCampaignOgImage } from "@/lib/og";
import { SLUG_PATTERN } from "@/lib/validations";

/**
 * Imagen para redes de una campaña: /og/campanas/<slug>.jpg (1200×630, JPEG).
 * La URL lleva ?v=<versión> (lib/seo.ts), así que se puede guardar en caché
 * mucho tiempo. Campaña inexistente u oculta → 404. Si la portada no se pudo
 * descargar, se sirve la imagen de la marca para que la vista previa no quede
 * vacía.
 */
export async function GET(_request: Request, { params }: RouteContext<"/og/campanas/[archivo]">) {
  const { archivo } = await params;
  const slug = archivo.endsWith(".jpg") ? archivo.slice(0, -4) : "";
  if (!SLUG_PATTERN.test(slug) || !(await getCampaignBySlug(slug))) {
    return new Response("Imagen no encontrada", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const cover = await getCampaignOgImage(slug);
  const body = Buffer.from(cover ?? (await getBrandOgImage()), "base64");
  return new Response(body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(body.length),
      "Cache-Control": cover
        ? "public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400"
        : "public, max-age=300, s-maxage=300",
    },
  });
}
