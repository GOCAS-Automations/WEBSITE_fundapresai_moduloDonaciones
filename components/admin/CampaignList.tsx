"use client";

/**
 * Listado de campañas del panel: miniatura, título, estado, destacada y
 * acciones grandes con texto (Editar, Ver, Ocultar/Mostrar, Eliminar, Subir y
 * Bajar). Eliminar pide confirmación con un modal propio.
 */
import { ArrowDown, ArrowUp, Eye, EyeOff, ExternalLink, Loader2, Pencil, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { deleteCampaign, moveCampaign, setCampaignVisibility } from "@/app/admin/(panel)/campanas/actions";
import { CampaignCover } from "@/components/campaign/CampaignCover";
import { Button, buttonClasses } from "@/components/ui/Button";
import type { ActionState } from "@/lib/admin/action-state";
import type { CampaignStatus } from "@/lib/validations";
import { ConfirmDialog } from "./ConfirmDialog";
import { FormMessage } from "./form";
import { StatusBadge } from "./ui";

export type CampaignListItem = {
  id: string;
  slug: string;
  title: string;
  status: CampaignStatus;
  is_featured: boolean;
  cover_image_url: string | null;
  cover_image_alt: string;
};

type Busy = { id: string; kind: "up" | "down" | "visibility" | "delete" } | null;

export function CampaignList({ campaigns, initialMessage }: { campaigns: CampaignListItem[]; initialMessage?: string }) {
  const [message, setMessage] = useState<ActionState>(
    initialMessage ? { status: "success", message: initialMessage, at: 1 } : { status: "idle", message: "" },
  );
  const [busy, setBusy] = useState<Busy>(null);
  const [toDelete, setToDelete] = useState<CampaignListItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const messageRef = useRef<HTMLDivElement>(null);

  function run(next: Busy, action: () => Promise<ActionState>, after?: () => void) {
    if (isPending) return;
    setBusy(next);
    startTransition(async () => {
      const result = await action();
      setMessage(result);
      setBusy(null);
      after?.();
    });
  }

  const isBusy = (id: string, kind: NonNullable<Busy>["kind"]) => isPending && busy?.id === id && busy.kind === kind;

  /** Subir y Bajar: en celular van en la grilla de acciones; desde sm, en columna a la derecha. */
  const reorder = (campaign: CampaignListItem, index: number, className: string) => (
    <div className={className}>
      <Button
        variant="secondary"
        disabled={isPending || index === 0}
        icon={isBusy(campaign.id, "up") ? <Loader2 className="animate-spin" /> : <ArrowUp />}
        onClick={() => run({ id: campaign.id, kind: "up" }, () => moveCampaign(campaign.id, "up"))}
      >
        Subir<span className="sr-only"> «{campaign.title}»</span>
      </Button>
      <Button
        variant="secondary"
        disabled={isPending || index === campaigns.length - 1}
        icon={isBusy(campaign.id, "down") ? <Loader2 className="animate-spin" /> : <ArrowDown />}
        onClick={() => run({ id: campaign.id, kind: "down" }, () => moveCampaign(campaign.id, "down"))}
      >
        Bajar<span className="sr-only"> «{campaign.title}»</span>
      </Button>
    </div>
  );

  return (
    <>
      <div ref={messageRef} tabIndex={-1} className="mb-5 outline-none">
        <FormMessage state={message} />
      </div>

      <ol className="space-y-4">
        {campaigns.map((campaign, index) => {
          const titleId = `campana-${campaign.id}`;
          const visible = campaign.status === "active";
          return (
            <li
              key={campaign.id}
              aria-labelledby={titleId}
              className="rounded-[var(--radius-card)] bg-surface p-4 shadow-soft ring-1 ring-black/[0.05] sm:p-5"
            >
              <div className="flex gap-4">
                <div className="relative aspect-[16/10] w-28 shrink-0 self-start overflow-hidden rounded-xl bg-brand-purple-soft sm:w-40">
                  <CampaignCover src={campaign.cover_image_url} alt="" sizes="160px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base text-ink-muted">Posición {index + 1}</p>
                  <h2 id={titleId} className="text-lg leading-snug sm:text-xl">
                    {campaign.title}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge status={campaign.status} />
                    {campaign.is_featured && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange-soft px-3 py-0.5 text-base font-semibold text-brand-orange-ink">
                        <Star aria-hidden="true" className="size-[1.125rem] fill-current" />
                        Destacada
                      </span>
                    )}
                  </div>
                </div>
                {reorder(campaign, index, "hidden shrink-0 flex-col gap-2 sm:flex")}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <Link
                  href={`/admin/campanas/${campaign.id}/editar`}
                  className={buttonClasses({ variant: "tinted" })}
                >
                  <Pencil aria-hidden="true" className="size-5" />
                  Editar<span className="sr-only"> «{campaign.title}»</span>
                </Link>
                {visible ? (
                  <a
                    href={`/campanas/${campaign.slug}`}
                    target="_blank"
                    rel="noopener"
                    className={buttonClasses({ variant: "secondary" })}
                  >
                    <ExternalLink aria-hidden="true" className="size-5" />
                    Ver<span className="sr-only"> «{campaign.title}» en el sitio (otra pestaña)</span>
                  </a>
                ) : (
                  <span className="inline-flex min-h-12 items-center justify-center rounded-full px-3 text-center text-base text-ink-muted">
                    No se ve en el sitio
                  </span>
                )}
                <Button
                  variant="secondary"
                  disabled={isPending}
                  icon={isBusy(campaign.id, "visibility") ? <Loader2 className="animate-spin" /> : visible ? <EyeOff /> : <Eye />}
                  onClick={() =>
                    run({ id: campaign.id, kind: "visibility" }, () => setCampaignVisibility(campaign.id, !visible))
                  }
                >
                  {visible ? "Ocultar" : campaign.status === "draft" ? "Publicar" : "Mostrar"}
                  <span className="sr-only"> «{campaign.title}»</span>
                </Button>
                <Button
                  variant="dangerOutline"
                  disabled={isPending}
                  icon={<Trash2 />}
                  onClick={() => setToDelete(campaign)}
                >
                  Eliminar<span className="sr-only"> «{campaign.title}»</span>
                </Button>
                {reorder(campaign, index, "contents sm:hidden")}
              </div>
            </li>
          );
        })}
      </ol>

      <ConfirmDialog
        open={toDelete !== null}
        title={toDelete ? `¿Eliminar «${toDelete.title}»?` : ""}
        description={
          <>
            La campaña se borrará para siempre y dejará de verse en el sitio. Si solo quiere quitarla por un tiempo, use
            «Ocultar».
          </>
        }
        confirmLabel="Sí, eliminar"
        pendingLabel="Eliminando…"
        pending={toDelete !== null && isBusy(toDelete.id, "delete")}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          const target = toDelete;
          run({ id: target.id, kind: "delete" }, () => deleteCampaign(target.id), () => {
            setToDelete(null);
            // El botón que abrió el modal ya no existe: el foco va al mensaje.
            requestAnimationFrame(() => messageRef.current?.focus());
          });
        }}
      />
    </>
  );
}
