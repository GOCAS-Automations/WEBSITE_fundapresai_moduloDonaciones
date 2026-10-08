"use client";

/**
 * «Usuarios» (solo administrador general): listado de cuentas con nombre,
 * usuario, insignia, creación y último ingreso; editar nombre y usuario,
 * restablecer contraseña y quitar acceso (modal propio); y crear administrador.
 * Las contraseñas nuevas se muestran una sola vez (OneTimePassword) y nunca
 * vuelven del servidor: se guardan solo en la memoria de esta página.
 */
import { KeyRound, Pencil, ShieldCheck, UserPlus, UserRound, UserX } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";

import {
  createPanelUser,
  removePanelUser,
  resetPanelUserPassword,
  updatePanelUser,
} from "@/app/admin/(panel)/usuarios/actions";
import { Button, buttonClasses } from "@/components/ui/Button";
import type { ActionState } from "@/lib/admin/action-state";
import { PASSWORD_HINT } from "@/lib/admin/password";
import { normalizeUsername, USERNAME_HINT } from "@/lib/admin/username";
import { ConfirmDialog } from "./ConfirmDialog";
import { FormMessage, SubmitButton, TextField, useAdminForm } from "./form";
import { OneTimePassword, PasswordField } from "./PasswordField";
import { Section } from "./ui";

export type PanelUserView = {
  id: string;
  name: string;
  username: string;
  isSuper: boolean;
  /** Fechas ya formateadas en el servidor (zona horaria de Colombia). */
  created: string;
  lastSignIn: string | null;
};

type Secret = { title: string; username: string; password: string };
type Panel = { id: string; kind: "edit" | "reset" } | null;

const IDLE_MESSAGE: ActionState = { status: "idle", message: "" };

export function UserManager({ users, currentUserId }: { users: PanelUserView[]; currentUserId: string }) {
  const [message, setMessage] = useState<ActionState>(IDLE_MESSAGE);
  const [panel, setPanel] = useState<Panel>(null);
  const [secret, setSecret] = useState<(Secret & { userId: string }) | null>(null);
  const [toRemove, setToRemove] = useState<PanelUserView | null>(null);
  const [removing, startRemove] = useTransition();
  const messageRef = useRef<HTMLDivElement>(null);
  const superCount = users.filter((u) => u.isSuper).length;

  const announce = (state: ActionState) => {
    setMessage(state);
    requestAnimationFrame(() => messageRef.current?.focus());
  };

  return (
    <>
      <div ref={messageRef} tabIndex={-1} className="mb-5 outline-none">
        <FormMessage state={message} />
      </div>

      <Section id="cuentas" title="Cuentas con acceso al panel">
        <ul className="divide-y divide-separator">
          {users.map((user) => {
            const self = user.id === currentUserId;
            const titleId = `usuario-${user.id}`;
            const panelId = `usuario-${user.id}-panel`;
            const isLastSuper = user.isSuper && superCount <= 1;
            const open = panel?.id === user.id ? panel.kind : null;
            const shownSecret = secret?.userId === user.id ? secret : null;
            return (
              <li key={user.id} aria-labelledby={titleId} className="py-5 first:pt-0 last:pb-0">
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="hidden size-12 shrink-0 place-items-center rounded-full bg-brand-purple-soft sm:grid text-lg font-semibold text-brand-purple"
                  >
                    {initials(user.name || user.username)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 id={titleId} className="text-xl leading-snug">
                      {user.name || "Sin nombre"}
                      {self && <span className="ml-2 text-base font-normal text-ink-muted">(usted)</span>}
                    </h3>
                    <p className="break-all text-base text-ink-muted">
                      Usuario: <span className="font-semibold text-ink">{user.username}</span>
                    </p>
                    {user.isSuper && (
                      <p className="mt-2">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-orange-soft px-3 py-0.5 text-base font-semibold text-brand-orange-ink">
                          <ShieldCheck aria-hidden="true" className="size-[1.125rem]" />
                          Administrador general
                        </span>
                      </p>
                    )}
                    <dl className="mt-3 grid gap-x-6 gap-y-1 text-base sm:grid-cols-2">
                      <div>
                        <dt className="inline text-ink-muted">Creada: </dt>
                        <dd className="inline">{user.created}</dd>
                      </div>
                      <div>
                        <dt className="inline text-ink-muted">Último ingreso: </dt>
                        <dd className="inline">{user.lastSignIn ?? "nunca ha entrado"}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                  {self ? (
                    <Link href="/admin/cuenta" className={buttonClasses({ variant: "tinted" })}>
                      <UserRound aria-hidden="true" className="size-5" />
                      Cambiar mi nombre o contraseña
                    </Link>
                  ) : (
                    <>
                      <Button
                        variant="tinted"
                        icon={<Pencil />}
                        aria-expanded={open === "edit"}
                        aria-controls={open === "edit" ? panelId : undefined}
                        onClick={() => setPanel(open === "edit" ? null : { id: user.id, kind: "edit" })}
                      >
                        Editar nombre o usuario<span className="sr-only"> de {user.name || user.username}</span>
                      </Button>
                      <Button
                        variant="secondary"
                        icon={<KeyRound />}
                        aria-expanded={open === "reset"}
                        aria-controls={open === "reset" ? panelId : undefined}
                        onClick={() => {
                          setSecret(null);
                          setPanel(open === "reset" ? null : { id: user.id, kind: "reset" });
                        }}
                      >
                        Restablecer contraseña<span className="sr-only"> de {user.name || user.username}</span>
                      </Button>
                      {isLastSuper ? (
                        <p className="self-center text-base text-ink-muted">Es el único administrador general.</p>
                      ) : (
                        <Button variant="dangerOutline" icon={<UserX />} onClick={() => setToRemove(user)}>
                          Quitar acceso<span className="sr-only"> a {user.name || user.username}</span>
                        </Button>
                      )}
                    </>
                  )}
                </div>

                {open && (
                  <div id={panelId} className="mt-4 rounded-2xl bg-surface-muted p-4 ring-1 ring-black/[0.05] sm:p-5">
                    {open === "edit" ? (
                      <EditUserForm
                        user={user}
                        onCancel={() => setPanel(null)}
                        onDone={(state) => {
                          setPanel(null);
                          announce(state);
                        }}
                      />
                    ) : (
                      <ResetForm
                        user={user}
                        onCancel={() => setPanel(null)}
                        onDone={(password) => {
                          setPanel(null);
                          setSecret({
                            userId: user.id,
                            title: `Nueva contraseña de ${user.name || user.username}`,
                            username: user.username,
                            password,
                          });
                        }}
                      />
                    )}
                  </div>
                )}
                {shownSecret && (
                  <div className="mt-4">
                    <OneTimePassword {...shownSecret} onDone={() => setSecret(null)} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <CreateUserSection />

      <ConfirmDialog
        open={toRemove !== null}
        title={toRemove ? `¿Quitar el acceso a ${toRemove.name || toRemove.username}?` : ""}
        description={
          <>
            Se borrará su usuario y ya no podrá entrar al panel. Las campañas y los textos que haya editado no cambian. Si
            más adelante necesita acceso otra vez, créele una cuenta nueva.
          </>
        }
        confirmLabel="Sí, quitar acceso"
        pendingLabel="Quitando…"
        pending={removing}
        onClose={() => setToRemove(null)}
        onConfirm={() => {
          if (!toRemove || removing) return;
          const target = toRemove;
          startRemove(async () => {
            const result = await removePanelUser(target.id);
            setToRemove(null);
            if (secret?.userId === target.id) setSecret(null);
            // El botón que abrió el modal ya no existe: el foco va al mensaje.
            announce(result);
          });
        }}
      />
    </>
  );
}

function initials(text: string): string {
  const parts = text.replace(/@.*/, "").split(/[\s.·_-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

// -----------------------------------------------------------------------------
// Editar nombre y usuario (el usuario cambia también su correo interno en Auth)
// -----------------------------------------------------------------------------

function EditUserForm({
  user,
  onCancel,
  onDone,
}: {
  user: PanelUserView;
  onCancel: () => void;
  onDone: (state: ActionState) => void;
}) {
  const { state, fieldErrors, pending, formRef, onSubmit } = useAdminForm(useMemo(() => updatePanelUser.bind(null, user.id), [user.id]));
  useEffect(() => {
    if (state.status === "success") onDone(state);
  }, [state, onDone]);
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-5">
      <TextField
        label="Nombre"
        name="name"
        defaultValue={user.name}
        max={120}
        autoComplete="off"
        error={fieldErrors.name}
        autoFocus
      />
      <TextField
        label="Usuario"
        name="username"
        defaultValue={user.username}
        max={30}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        hint={`${USERNAME_HINT} Si lo cambia, avísele: desde ese momento entra con el nuevo (la contraseña no cambia).`}
        error={fieldErrors.username}
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <SubmitButton pending={pending}>Guardar cambios</SubmitButton>
        <Button variant="secondary" size="lg" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
      </div>
      <FormMessage state={state.status === "error" ? state : IDLE_MESSAGE} />
    </form>
  );
}

// -----------------------------------------------------------------------------
// Restablecer contraseña
// -----------------------------------------------------------------------------

function ResetForm({
  user,
  onCancel,
  onDone,
}: {
  user: PanelUserView;
  onCancel: () => void;
  onDone: (password: string) => void;
}) {
  const { state, fieldErrors, pending, formRef, onSubmit } = useAdminForm(useMemo(() => resetPanelUserPassword.bind(null, user.id), [user.id]));
  const submitted = useRef("");
  useEffect(() => {
    if (state.status === "success") onDone(submitted.current);
  }, [state, onDone]);
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    submitted.current = String(new FormData(event.currentTarget).get("password") ?? "");
    onSubmit(event);
  };
  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
      <p className="text-base text-ink-muted">
        Escriba una contraseña nueva o genere una. La actual dejará de funcionar. No se envía ningún correo: entréguesela a
        la persona.
      </p>
      <PasswordField
        label="Nueva contraseña"
        name="password"
        autoComplete="new-password"
        hint={PASSWORD_HINT}
        error={fieldErrors.password}
        canGenerate
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <SubmitButton pending={pending} pendingLabel="Restableciendo…" icon={<KeyRound />}>
          Restablecer contraseña
        </SubmitButton>
        <Button variant="secondary" size="lg" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
      </div>
      <FormMessage state={state.status === "error" ? state : IDLE_MESSAGE} />
    </form>
  );
}

// -----------------------------------------------------------------------------
// Crear administrador
// -----------------------------------------------------------------------------

function CreateUserSection() {
  const [formKey, setFormKey] = useState(0);
  const [secret, setSecret] = useState<Secret | null>(null);
  return (
    <Section
      id="crear"
      title="Crear administrador"
      description="La cuenta queda lista para entrar, sin correo de confirmación. Podrá editar el sitio y las campañas, pero no gestionar usuarios."
      className="mt-10"
    >
      {secret && (
        <div className="mb-6">
          <OneTimePassword {...secret} onDone={() => setSecret(null)} />
        </div>
      )}
      <CreateUserForm
        key={formKey}
        onCreated={(created) => {
          setSecret(created);
          setFormKey((k) => k + 1);
        }}
      />
    </Section>
  );
}

function CreateUserForm({ onCreated }: { onCreated: (secret: Secret) => void }) {
  const { state, fieldErrors, pending, formRef, onSubmit } = useAdminForm(createPanelUser);
  const submitted = useRef<{ name: string; username: string; password: string } | null>(null);

  useEffect(() => {
    if (state.status !== "success" || !submitted.current) return;
    const { name, username, password } = submitted.current;
    onCreated({ title: `Se creó la cuenta de ${name}`, username, password });
  }, [state, onCreated]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const data = new FormData(event.currentTarget);
    submitted.current = {
      name: String(data.get("name") ?? "").trim(),
      username: normalizeUsername(String(data.get("username") ?? "")),
      password: String(data.get("password") ?? ""),
    };
    onSubmit(event);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
      <TextField label="Nombre" name="name" max={120} autoComplete="off" hint="Se usa en el saludo del panel." error={fieldErrors.name} />
      <TextField
        label="Usuario"
        name="username"
        max={30}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        hint={`${USERNAME_HINT} Ejemplo: maria.perez`}
        error={fieldErrors.username}
      />
      <PasswordField
        label="Contraseña"
        name="password"
        autoComplete="new-password"
        hint={PASSWORD_HINT}
        error={fieldErrors.password}
        canGenerate
      />
      <div className="space-y-4 border-t border-separator pt-5">
        <SubmitButton pending={pending} pendingLabel="Creando…" icon={<UserPlus />}>
          Crear cuenta
        </SubmitButton>
        <FormMessage state={state.status === "error" ? state : IDLE_MESSAGE} />
      </div>
    </form>
  );
}
