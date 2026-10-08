import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";

import { getSiteUrl } from "@/lib/env";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, LOCALE, SITE_NAME, robotsMetadata } from "@/lib/seo";

import "./globals.css";

const poppins = Poppins({
  // Solo los pesos que se usan (font-normal, font-medium y font-semibold): 300 no se usa en ninguna parte.
  weight: ["400", "500", "600"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: DEFAULT_TITLE, template: `%s · ${SITE_NAME}` },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: "website", locale: LOCALE, siteName: SITE_NAME },
  robots: robotsMetadata(),
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#5f2c85",
  width: "device-width",
  initialScale: 1,
  // Sin maximumScale ni userScalable: el zoom del usuario nunca se bloquea.
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-scroll-behavior="smooth": Next 16 quita el desplazamiento suave MIENTRAS cambia de página, así cada
    // navegación aterriza arriba al instante (sin ella, la subida animada de ~1 s se cortaba si la persona
    // tocaba la pantalla). Las anclas dentro de una misma página siguen siendo suaves (globals.css).
    <html lang="es-CO" className={poppins.variable} data-scroll-behavior="smooth">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
