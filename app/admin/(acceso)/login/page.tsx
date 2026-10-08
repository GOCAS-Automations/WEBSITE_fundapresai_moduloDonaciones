import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm, SignedOutNotice } from "@/components/admin/AuthForms";

export const metadata: Metadata = { title: "Entrar" };

/** Página estática: el formulario va en el HTML inicial; ?next= y ?salio= se leen en el navegador. */
export default function LoginPage() {
  return (
    <>
      <h1 className="text-[2rem] leading-tight tracking-[-0.02em]">Panel de Fundapresai</h1>
      <p className="mt-2 mb-8 text-lg text-ink-muted">Entre con su correo y su contraseña.</p>
      <Suspense fallback={null}>
        <SignedOutNotice />
      </Suspense>
      <LoginForm />
    </>
  );
}
