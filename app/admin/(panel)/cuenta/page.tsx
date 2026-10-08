import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { signOut } from "@/app/admin/actions";
import { OwnNameForm, OwnPasswordForm } from "@/components/admin/AccountForms";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { AdminContainer, PageHeader, Section } from "@/components/admin/ui";
import { getAdminContext } from "@/lib/admin/session";
import { usernameFromEmail } from "@/lib/admin/username";

export const metadata: Metadata = { title: "Mi cuenta" };

/** «Mi cuenta»: para todos los administradores (nombre, contraseña y cerrar sesión). */
export default async function AccountPage() {
  const ctx = await getAdminContext();
  if (!ctx.ok) return null;

  const { data: admin } = await ctx.supabase
    .from("admins")
    .select("name, username, is_super")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  return (
    <AdminContainer>
      <PageHeader
        back={{ href: "/admin", label: "Inicio" }}
        title="Mi cuenta"
        description="Su usuario, su nombre y su contraseña para entrar al panel."
      />

      <div className="space-y-10">
        <Section id="datos" title="Sus datos">
          <dl className="mb-6 grid gap-4 text-lg sm:grid-cols-2">
            <div>
              <dt className="text-base text-ink-muted">Usuario para entrar</dt>
              <dd className="break-all font-semibold">{admin?.username ?? usernameFromEmail(ctx.user.email) ?? ""}</dd>
            </div>
            <div>
              <dt className="text-base text-ink-muted">Permisos</dt>
              <dd className="font-semibold">
                {admin?.is_super ? (
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck aria-hidden="true" className="size-5 text-brand-orange-ink" />
                    Administrador general
                  </span>
                ) : (
                  "Administrador del sitio"
                )}
              </dd>
            </div>
          </dl>
          <OwnNameForm name={admin?.name ?? ""} />
        </Section>

        <Section
          id="contrasena"
          title="Cambiar contraseña"
          description="Por seguridad, primero escriba su contraseña actual."
        >
          <OwnPasswordForm />
        </Section>

        <section aria-labelledby="salir-titulo" className="sm:hidden">
          <h2 id="salir-titulo" className="mb-3 px-1 text-2xl tracking-[-0.01em]">
            Cerrar sesión
          </h2>
          <form action={signOut}>
            <SignOutButton variant="primary" />
          </form>
        </section>
      </div>
    </AdminContainer>
  );
}
