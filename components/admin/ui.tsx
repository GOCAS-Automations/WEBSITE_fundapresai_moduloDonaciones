/**
 * Piezas visuales del panel (estilo iOS «Ajustes»): columna centrada, título
 * grande, grupos blancos sobre gris y avisos. Sin estado: sirven en Server y
 * Client Components.
 */
import { AlertTriangle, CheckCircle2, ChevronLeft, EyeOff, FilePen, Info, XCircle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import { CAMPAIGN_STATUS_LABELS, type CampaignStatus } from "@/lib/validations";

export function AdminContainer({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-3xl px-4 sm:px-6", className)}>{children}</div>;
}

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** Enlace «‹ Volver» estilo iOS. */
  back?: { href: string; label: string };
  actions?: ReactNode;
};

export function PageHeader({ title, description, back, actions }: PageHeaderProps) {
  return (
    <div className="pb-6 pt-6 sm:pt-8">
      {back && (
        <Link
          href={back.href}
          className="-ml-2 inline-flex min-h-12 items-center gap-1 rounded-xl px-2 text-lg font-medium text-brand-purple hover:bg-brand-purple-soft"
        >
          <ChevronLeft aria-hidden="true" className="size-6" />
          {back.label}
        </Link>
      )}
      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
        <div className="min-w-0 max-w-2xl">
          <h1 className="text-[2rem] leading-tight tracking-[-0.02em] sm:text-4xl">{title}</h1>
          {description && <div className="mt-3 text-lg text-ink-muted">{description}</div>}
        </div>
        {actions}
      </div>
    </div>
  );
}

type SectionProps = {
  title?: string;
  description?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
};

/** Grupo blanco con esquinas redondeadas (como una sección de «Ajustes»). */
export function Section({ title, description, id, className, children }: SectionProps) {
  const headingId = id ? `${id}-titulo` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn("scroll-mt-28", className)}>
      {title && (
        <div className="mb-3 px-1">
          <h2 id={headingId} className="text-2xl tracking-[-0.01em]">
            {title}
          </h2>
          {description && <p className="mt-1 text-base text-ink-muted">{description}</p>}
        </div>
      )}
      <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-soft ring-1 ring-black/[0.05] sm:p-7">
        {children}
      </div>
    </section>
  );
}

type NoticeTone = "info" | "success" | "warning" | "error";

const NOTICE_STYLES: Record<NoticeTone, { box: string; icon: ReactNode }> = {
  info: {
    box: "bg-brand-periwinkle-soft text-ink ring-brand-periwinkle/25",
    icon: <Info className="size-6 text-brand-periwinkle-ink" />,
  },
  success: {
    box: "bg-success-bg text-success-ink ring-success-ink/20",
    icon: <CheckCircle2 className="size-6" />,
  },
  warning: {
    box: "bg-warning-bg text-warning-ink ring-warning-ink/20",
    icon: <AlertTriangle className="size-6" />,
  },
  error: {
    box: "bg-danger-bg text-danger-ink ring-danger-ink/20",
    icon: <XCircle className="size-6" />,
  },
};

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: NoticeTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const style = NOTICE_STYLES[tone];
  return (
    <div className={cn("flex gap-3 rounded-2xl p-4 ring-1 sm:p-5", style.box, className)}>
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        {style.icon}
      </span>
      <div className="min-w-0 text-base">
        {title && <p className="text-lg font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-1")}>{children}</div>}
      </div>
    </div>
  );
}

/** Insignias de estado (contraste AA verificado en scripts/check-contrast.ts). Siempre con texto. */
const STATUS_BADGES: Record<CampaignStatus, { className: string; icon: ReactNode }> = {
  active: {
    className: "bg-success-bg text-success-ink",
    icon: <CheckCircle2 className="size-[1.125rem]" />,
  },
  draft: {
    className: "bg-neutral-bg text-ink-muted",
    icon: <FilePen className="size-[1.125rem]" />,
  },
  hidden: {
    className: "bg-warning-bg text-warning-ink",
    icon: <EyeOff className="size-[1.125rem]" />,
  },
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  const badge = STATUS_BADGES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-base font-semibold",
        badge.className,
      )}
    >
      <span aria-hidden="true">{badge.icon}</span>
      {CAMPAIGN_STATUS_LABELS[status]}
    </span>
  );
}
