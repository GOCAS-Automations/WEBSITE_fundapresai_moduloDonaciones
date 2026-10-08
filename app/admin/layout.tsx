import type { Metadata } from "next";

/**
 * Raíz del panel. Nunca se indexa: meta robots aquí y además la cabecera
 * X-Robots-Tag de /admin en next.config.ts.
 */
export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel de Fundapresai" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-dvh bg-surface-muted">{children}</div>;
}
