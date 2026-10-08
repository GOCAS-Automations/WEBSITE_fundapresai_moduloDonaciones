import { ChevronRight, ExternalLink, Megaphone, PencilLine, UserRound, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { AdminContainer, Notice } from "@/components/admin/ui";
import { cn } from "@/components/ui/cn";
import { getAdminContext, getIsSuperAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Inicio" };

/** Más de 72 h sin latido: el proyecto de Supabase podría pausarse (plan §10.1). */
const HEARTBEAT_ALERT_HOURS = 72;

const rtf = new Intl.RelativeTimeFormat("es-CO", { numeric: "always" });

function ago(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return rtf.format(-Math.max(1, minutes), "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 48) return rtf.format(-hours, "hour");
  return rtf.format(-Math.round(hours / 24), "day");
}

/** Milisegundos desde una fecha (fuera del componente: render puro). */
function elapsedSince(date: Date): number {
  return Date.now() - date.getTime();
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

type TileProps = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  tint: string;
  external?: boolean;
};

function Tile({ href, title, description, icon, tint, external }: TileProps) {
  const content = (
    <>
      <span aria-hidden="true" className={cn("grid size-14 shrink-0 place-items-center rounded-2xl [&>svg]:size-7", tint)}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xl font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-base text-ink-muted">{description}</span>
      </span>
      {external ? (
        <ExternalLink aria-hidden="true" className="size-6 shrink-0 text-ink-muted" />
      ) : (
        <ChevronRight aria-hidden="true" className="size-7 shrink-0 text-ink-muted" />
      )}
    </>
  );
  const className =
    "flex min-h-24 items-center gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-soft ring-1 ring-black/[0.05] transition hover:shadow-lifted active:scale-[0.99] sm:p-6";
  return external ? (
    <a href={href} target="_blank" rel="noopener" className={className}>
      {content}
      <span className="sr-only"> (se abre en otra pestaña)</span>
    </a>
  ) : (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

export default async function AdminHomePage({ searchParams }: PageProps<"/admin">) {
  const ctx = await getAdminContext();
  if (!ctx.ok) return null;

  const [{ data: admin }, heartbeat, { data: campaigns }, params, isSuper] = await Promise.all([
    ctx.supabase.from("admins").select("name").eq("user_id", ctx.user.id).maybeSingle(),
    ctx.supabase.rpc("last_heartbeat"),
    ctx.supabase.from("campaigns").select("status"),
    searchParams,
    getIsSuperAdmin(),
  ]);

  const firstName = admin?.name?.trim().split(/\s+/)[0];
  const active = campaigns?.filter((c) => c.status === "active").length ?? 0;
  const others = (campaigns?.length ?? 0) - active;

  const last = heartbeat.data ? new Date(heartbeat.data) : null;
  const ageMs = last ? elapsedSince(last) : null;
  const stale = ageMs === null || ageMs > HEARTBEAT_ALERT_HOURS * 3600_000;

  return (
    <AdminContainer>
      <div className="pb-6 pt-8 sm:pt-10">
        <h1 className="text-[2rem] leading-tight tracking-[-0.02em] sm:text-4xl">
          {firstName ? `Hola, ${firstName}` : "Hola"}
        </h1>
        <p className="mt-2 text-lg text-ink-muted">¿Qué quiere hacer hoy?</p>
      </div>

      {params.aviso === "clave" && (
        <Notice tone="success" className="mb-6">
          Su contraseña se cambió correctamente.
        </Notice>
      )}

      <nav aria-label="Secciones del panel">
        <ul className="grid gap-4">
          <li>
            <Tile
              href="/admin/contenido"
              title="Editar sitio"
              description="Textos de la portada, quiénes somos, cómo donar, contacto y redes."
              icon={<PencilLine />}
              tint="bg-brand-purple-soft text-brand-purple"
            />
          </li>
          <li>
            <Tile
              href="/admin/campanas"
              title="Campañas"
              description={`${plural(active, "activa", "activas")}${others ? ` · ${plural(others, "sin publicar", "sin publicar")}` : ""}. Crear, editar, ordenar u ocultar.`}
              icon={<Megaphone />}
              tint="bg-brand-orange-soft text-brand-orange-ink"
            />
          </li>
          {isSuper && (
            <li>
              <Tile
                href="/admin/usuarios"
                title="Usuarios"
                description="Crear cuentas, restablecer contraseñas y quitar accesos del panel."
                icon={<Users />}
                tint="bg-success-bg text-success-ink"
              />
            </li>
          )}
          <li>
            <Tile
              href="/admin/cuenta"
              title="Mi cuenta"
              description="Cambiar su contraseña o su nombre."
              icon={<UserRound />}
              tint="bg-neutral-bg text-ink"
            />
          </li>
          <li>
            <Tile
              href="/"
              external
              title="Ver sitio"
              description="Abre el sitio público para revisar cómo quedó."
              icon={<ExternalLink />}
              tint="bg-brand-periwinkle-soft text-brand-periwinkle-ink"
            />
          </li>
        </ul>
      </nav>

      <div className="mt-10">
        {stale ? (
          <Notice tone="warning" title="La base de datos no ha recibido su latido">
            {last && ageMs !== null
              ? `El último latido fue ${ago(ageMs)}. `
              : "No hay ningún latido registrado. "}
            Por favor avise a GOCAS: si pasan 7 días sin actividad, el plan gratuito pausa la base de datos y el sitio
            deja de mostrar las campañas.
          </Notice>
        ) : (
          <p className="flex items-center gap-2.5 text-base text-ink-muted">
            <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-success-ink" />
            Base de datos activa · último latido {ago(ageMs!)}
          </p>
        )}
      </div>
    </AdminContainer>
  );
}
