import type { Metadata } from "next";

import { CampaignForm } from "@/components/admin/CampaignForm";
import { AdminContainer, PageHeader } from "@/components/admin/ui";
import { getAdminContext } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Nueva campaña" };

export default async function NewCampaignPage() {
  const ctx = await getAdminContext();
  if (!ctx.ok) return null;

  const { data: featured } = await ctx.supabase.from("campaigns").select("title").eq("is_featured", true).maybeSingle();

  return (
    <AdminContainer>
      <PageHeader
        back={{ href: "/admin/campanas", label: "Campañas" }}
        title="Nueva campaña"
        description="Puede guardarla como «Borrador» y publicarla cuando esté lista."
      />
      <CampaignForm currentFeaturedTitle={featured?.title ?? null} />
    </AdminContainer>
  );
}
