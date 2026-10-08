import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AdminContainer, Notice, PageHeader } from "@/components/admin/ui";
import { UserManager, type PanelUserView } from "@/components/admin/UserManager";
import { buttonClasses } from "@/components/ui/Button";
import { listPanelUsers, requireSuperAdmin } from "@/lib/admin/accounts";
import { humanizeError } from "@/lib/admin/errors";
import { getAdminContext } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Usuarios" };

const TZ = "America/Bogota";
const dateFmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: TZ });
const dateTimeFmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: TZ });

/**
 * Gestión de cuentas del panel. Solo el administrador general: se verifica
 * en el servidor con su sesión (is_super_admin()) antes de leer nada con la
 * clave secreta. Un administrador normal ve un aviso y ningún formulario.
 */
export default async function UsersPage() {
  const ctx = await getAdminContext();
  if (!ctx.ok) return null;

  const auth = await requireSuperAdmin(ctx);
  if (!auth.ok) {
    return (
      <AdminContainer>
        <PageHeader back={{ href: "/admin", label: "Inicio" }} title="Esta sección es solo para el administrador general" />
        <Notice tone="warning">
          Aquí se crean y se quitan las cuentas del panel. Si necesita una cuenta nueva para alguien del equipo o
          restablecer una contraseña, pídaselo al administrador general.
        </Notice>
        <Link href="/admin" className={buttonClasses({ size: "lg", className: "mt-6" })}>
          Volver al inicio
        </Link>
      </AdminContainer>
    );
  }

  const { users, error } = await listPanelUsers(auth);
  const view: PanelUserView[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    isSuper: u.isSuper,
    created: dateFmt.format(new Date(u.createdAt)),
    lastSignIn: u.lastSignInAt ? dateTimeFmt.format(new Date(u.lastSignInAt)) : null,
  }));

  return (
    <AdminContainer>
      <PageHeader
        back={{ href: "/admin", label: "Inicio" }}
        title="Usuarios"
        description="Cuentas que pueden entrar al panel. No se envían correos: al crear una cuenta o restablecer una contraseña, entréguesela usted a la persona."
        actions={
          <a href="#crear" className={buttonClasses({ size: "lg" })}>
            Crear administrador
          </a>
        }
      />
      {error ? (
        <Notice tone="error" title="No pudimos cargar las cuentas">
          {humanizeError(error, "listar usuarios")}
        </Notice>
      ) : (
        <UserManager users={view} currentUserId={auth.user.id} />
      )}
      <p className="mt-10 flex items-start gap-2 text-base text-ink-muted">
        <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        Por seguridad, ninguna contraseña se guarda a la vista: el panel solo la muestra una vez, en este navegador.
      </p>
    </AdminContainer>
  );
}
