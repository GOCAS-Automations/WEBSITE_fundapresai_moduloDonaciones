import { getBrandOgImage } from "@/lib/og";

/**
 * Imagen de marca para redes (1200×630, JPEG). Estática: se genera en el
 * build (lib/og.ts) y no cambia hasta el siguiente despliegue.
 */
export async function GET() {
  const body = Buffer.from(await getBrandOgImage(), "base64");
  return new Response(body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400",
    },
  });
}
