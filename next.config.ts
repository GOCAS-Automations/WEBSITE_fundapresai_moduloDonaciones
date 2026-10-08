import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING?.trim().toLowerCase() === "true";

/** Host del proyecto Supabase (p. ej. abcd.supabase.co) para CSP e imágenes. */
function supabaseHost(): string | null {
  try {
    const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    return raw ? new URL(raw).host : null;
  } catch {
    return null;
  }
}

const sbHost = supabaseHost();
const sbHttp = sbHost ? `https://${sbHost}` : "https://*.supabase.co";
const sbWs = sbHost ? `wss://${sbHost}` : "wss://*.supabase.co";

/**
 * Content-Security-Policy (plan §12).
 * - script-src 'unsafe-inline': las páginas son estáticas (ISR) y Next inyecta
 *   scripts en línea; los nonces exigirían render dinámico en cada visita.
 * - img-src https:: el panel permite pegar imágenes de otras nubes.
 * - connect-src: API, Auth y Storage de Supabase (panel).
 * - frame-src: solo el reproductor de Vimeo (video institucional, si se usa).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${sbHttp} ${sbWs}${isDev ? " ws: http://localhost:*" : ""}`,
  "frame-src https://player.vimeo.com",
  "media-src 'self' https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Trabajadores del build según la memoria libre (el equipo de desarrollo
  // tiene poca RAM: con 11 trabajadores el build se quedaba sin memoria).
  // NEXT_BUILD_CPUS=1 los limita a mano. En Vercel no cambia nada visible.
  experimental: {
    memoryBasedWorkersCount: true,
    ...(Number(process.env.NEXT_BUILD_CPUS) > 0 ? { cpus: Number(process.env.NEXT_BUILD_CPUS) } : {}),
  },
  // lib/og.ts lee estos archivos de public/ al armar la imagen para redes de
  // cada campaña (insignia con el logo y respaldo de marca).
  outputFileTracingIncludes: {
    "/og/**": ["./public/og/fundapresai.jpg", "./public/brand/logo-horizontal.png"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Solo se optimizan las imágenes del bucket público de Supabase.
    // Las URL externas se muestran con `unoptimized` (ver lib/images.ts).
    remotePatterns: [
      sbHost
        ? { protocol: "https", hostname: sbHost, pathname: "/storage/v1/object/public/**" }
        : { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    const rules = [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
    if (!allowIndexing) {
      // Demo en vercel.app: ninguna página se indexa (además del meta robots).
      rules.push({ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] });
    }
    return rules;
  },
};

export default nextConfig;
