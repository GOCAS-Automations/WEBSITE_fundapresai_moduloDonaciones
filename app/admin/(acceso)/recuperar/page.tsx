import type { Metadata } from "next";
import { Suspense } from "react";

import { RecoverForm } from "@/components/admin/AuthForms";
import { Notice } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Recuperar la contraseña" };

const ERRORS: Record<string, string> = {
  enlace: "El enlace para cambiar la contraseña no funcionó: ya venció o ya se usó. Pida uno nuevo aquí abajo.",
  navegador:
    "El enlace debe abrirse en el mismo navegador donde lo pidió. Pida uno nuevo aquí abajo y ábralo desde este mismo equipo.",
};

async function LinkError({ searchParams }: { searchParams: PageProps<"/admin/recuperar">["searchParams"] }) {
  const { error } = await searchParams;
  const text = typeof error === "string" ? ERRORS[error] : undefined;
  return text ? (
    <Notice tone="error" className="mb-6">
      {text}
    </Notice>
  ) : null;
}

export default function RecoverPage({ searchParams }: PageProps<"/admin/recuperar">) {
  return (
    <>
      <h1 className="text-[2rem] leading-tight tracking-[-0.02em]">¿Olvidó su contraseña?</h1>
      <p className="mt-2 mb-8 text-lg text-ink-muted">
        Escriba el correo con el que entra al panel y le enviaremos un enlace para crear una nueva.
      </p>
      <Suspense fallback={null}>
        <LinkError searchParams={searchParams} />
      </Suspense>
      <RecoverForm />
    </>
  );
}
