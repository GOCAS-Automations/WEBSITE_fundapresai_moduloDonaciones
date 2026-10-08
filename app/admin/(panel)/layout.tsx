import { Loader2 } from "lucide-react";
import { Suspense, type ReactNode } from "react";

import { signOut } from "@/app/admin/actions";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { AdminContainer, Notice } from "@/components/admin/ui";
import { getAdminContext } from "@/lib/admin/session";
import { usernameFromEmail } from "@/lib/admin/username";

/**
 * Marco del panel. El header es estático; lo que depende de la sesión va
 * dentro de <Suspense> (Cache Components). AdminGate verifica EN EL SERVIDOR
 * que el usuario esté en `admins` (is_admin()); el proxy solo es la primera
 * capa. Un usuario autenticado que no sea administrador ve un aviso amable y
 * ningún formulario (y RLS le bloquea igual cualquier escritura).
 */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only z-[60] rounded-full bg-brand-purple text-lg font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:px-6 focus:py-3"
      >
        Saltar al contenido
      </a>
      <AdminHeader />
      <main id="contenido" className="pb-24">
        <Suspense fallback={<PanelLoading />}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </main>
    </>
  );
}

function PanelLoading() {
  return (
    <AdminContainer className="pt-10">
      <p role="status" className="flex items-center gap-3 text-lg text-ink-muted">
        <Loader2 aria-hidden="true" className="size-6 animate-spin text-brand-purple" />
        Cargando…
      </p>
    </AdminContainer>
  );
}

async function AdminGate({ children }: { children: ReactNode }) {
  const ctx = await getAdminContext();
  if (ctx.ok) return children;

  const noAdmin = ctx.reason === "no-admin";
  return (
    <AdminContainer className="pt-10">
      <h1 className="text-[2rem] leading-tight tracking-[-0.02em]">
        {noAdmin ? "Su cuenta no tiene acceso al panel" : "Su sesión se cerró"}
      </h1>
      <Notice tone={noAdmin ? "warning" : "info"} className="mt-6">
        {noAdmin ? (
          <>
            Entró como <strong className="font-semibold">{usernameFromEmail(ctx.user.email) ?? ctx.user.email}</strong>, pero esta cuenta no está autorizada
            para editar el sitio. Si cree que es un error, escriba a GOCAS para que le den acceso.
          </>
        ) : (
          "Por seguridad, vuelva a entrar con su usuario y contraseña."
        )}
      </Notice>
      <form action={signOut} className="mt-6">
        <SignOutButton
          label={noAdmin ? "Cerrar sesión" : "Entrar de nuevo"}
          variant="primary"
        />
      </form>
    </AdminContainer>
  );
}
