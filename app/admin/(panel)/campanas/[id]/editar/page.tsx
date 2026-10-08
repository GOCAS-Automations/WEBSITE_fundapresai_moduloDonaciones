import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

import { CampaignForm } from "@/components/admin/CampaignForm";
import { AdminContainer, Notice, PageHeader } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { humanizeError } from "@/lib/admin/errors";
import { getAdminContext } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Editar campaña" };

const COLUMNS =
  "id, slug, title, tag, summary, body_md, cover_image_url, cover_image_alt, donation_url, donation_note, progress_percent, progress_label, status, is_featured, seo_title, seo_description";

export default async function EditCampaignPage({ params }: PageProps<"/admin/campanas/[id]/editar">) {
  const ctx = await getAdminContext();
  if (!ctx.ok) return null;
  const { id } = await params;

  const valid = z.uuid().safeParse(id).success;
  const [{ data: campaign, error }, { data: featured }] = valid
    ? await Promise.all([
        ctx.supabase.from("campaigns").select(COLUMNS).eq("id", id).maybeSingle(),
        ctx.supabase.from("campaigns").select("title").eq("is_featured", true).maybeSingle(),
      ])
    : [{ data: null, error: null }, { data: null }];

  if (!campaign) {
    return (
      <AdminContainer>
        <PageHeader back={{ href: "/admin/campanas", label: "Campañas" }} title="Campaña no encontrada" />
        <Notice tone={error ? "error" : "warning"}>
          {error ? humanizeError(error, "leer campaña") : "Puede que la hayan eliminado o que el enlace esté incompleto."}
        </Notice>
        <Link href="/admin/campanas" className={buttonClasses({ size: "lg", className: "mt-6" })}>
          Ver todas las campañas
        </Link>
      </AdminContainer>
    );
  }

  return (
    <AdminContainer>
      <PageHeader back={{ href: "/admin/campanas", label: "Campañas" }} title="Editar campaña" description={campaign.title} />
      <CampaignForm campaign={campaign} currentFeaturedTitle={featured?.title ?? null} />
    </AdminContainer>
  );
}
