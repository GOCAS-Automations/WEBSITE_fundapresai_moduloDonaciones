import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CampaignList } from "@/components/admin/CampaignList";
import { AdminContainer, Notice, PageHeader } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { humanizeError } from "@/lib/admin/errors";
import { getAdminContext } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Campañas" };

export default async function CampaignsPage({ searchParams }: PageProps<"/admin/campanas">) {
  const ctx = await getAdminContext();
  if (!ctx.ok) return null;

  const [{ data, error }, params] = await Promise.all([
    ctx.supabase
      .from("campaigns")
      .select("id, slug, title, status, is_featured, cover_image_url, cover_image_alt")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    searchParams,
  ]);

  const created = typeof params.creada === "string" ? data?.find((c) => c.slug === params.creada) : undefined;
  const initialMessage = created
    ? created.status === "active"
      ? `Se creó la campaña «${created.title}» y ya se ve en el sitio.`
      : `Se creó la campaña «${created.title}». Está como borrador u oculta: no se ve en el sitio hasta que la publique.`
    : undefined;

  return (
    <AdminContainer>
      <PageHeader
        back={{ href: "/admin", label: "Inicio" }}
        title="Campañas"
        description="En el sitio aparecen solo las campañas activas, en este orden (la destacada siempre va primero). Use «Subir» y «Bajar» para cambiarlo."
        actions={
          <Link href="/admin/campanas/nueva" className={buttonClasses({ size: "lg" })}>
            <Plus aria-hidden="true" className="size-6" />
            Nueva campaña
          </Link>
        }
      />

      {error ? (
        <Notice tone="error" title="No pudimos cargar las campañas">
          {humanizeError(error, "listar campañas")}
        </Notice>
      ) : data.length === 0 ? (
        <Notice title="Todavía no hay campañas">Toque «Nueva campaña» para crear la primera.</Notice>
      ) : (
        <CampaignList key={params.creada?.toString() ?? "lista"} campaigns={data} initialMessage={initialMessage} />
      )}
    </AdminContainer>
  );
}
