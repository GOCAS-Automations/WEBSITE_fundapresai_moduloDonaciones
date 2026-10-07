import Image from "next/image";
import { HandHeart } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

/**
 * Página provisional de la Fase 1 (base técnica).
 * La landing real (plan §5.1) se construye en la Fase 2, tras aprobar la propuesta visual.
 */
export default function HomePage() {
  return (
    <main id="contenido" className="flex min-h-dvh items-center bg-brand-cream py-16">
      <Container width="narrow">
        <Card className="space-y-8 p-8 text-center sm:p-12">
          <Image
            src="/brand/logo-vertical.png"
            alt="Fundapresai, Inspirando vidas en valores"
            width={720}
            height={743}
            priority
            className="mx-auto h-auto w-40 sm:w-48"
          />
          <div className="space-y-4">
            <h1 className="text-3xl text-brand-purple sm:text-5xl">Estamos preparando el nuevo sitio de donaciones</h1>
            <p className="text-ink-muted">
              Muy pronto podrá conocer aquí todas las campañas de la Fundación Fundapresai y donar de forma
              fácil y segura.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <ButtonLink
              href="https://colsai.edu.co/donaciones/"
              size="lg"
              icon={<HandHeart />}
            >
              Donar en la página actual
            </ButtonLink>
            <p className="text-sm text-ink-muted">
              Será llevado a la página de donaciones del Colegio de Valores Humanos Sathya Sai.
            </p>
          </div>
        </Card>
      </Container>
    </main>
  );
}
