import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/admin/AuthForms";
import { Notice } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nueva contraseña" };

/** Solo con la sesión que abre el enlace del correo (o con la sesión normal). */
async function ResetContent() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Notice tone="warning" title="Este enlace ya no sirve">
          Puede que haya vencido (dura una hora) o que ya se haya usado. Pida uno nuevo.
        </Notice>
        <Link href="/admin/recuperar" className={buttonClasses({ size: "lg", fullWidth: true, className: "mt-6" })}>
          Pedir un enlace nuevo
        </Link>
      </>
    );
  }

  return (
    <>
      <p className="mb-6 text-lg text-ink-muted">
        Cuenta: <strong className="font-semibold text-ink">{user.email}</strong>
      </p>
      <ResetPasswordForm />
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-[2rem] leading-tight tracking-[-0.02em]">Cree su nueva contraseña</h1>
      <p className="mt-2 mb-6 text-lg text-ink-muted">Escríbala dos veces. Después entrará directo al panel.</p>
      <Suspense fallback={<p role="status" className="text-lg text-ink-muted">Cargando…</p>}>
        <ResetContent />
      </Suspense>
    </>
  );
}
