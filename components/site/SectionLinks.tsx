"use client";

/**
 * Enlaces a las secciones de la landing (#campanas, #quienes-somos…) que
 * funcionan SIEMPRE:
 * - En la landing: desplazan hasta la sección aunque la dirección ya tenga
 *   ese #hash o la persona ya esté cerca (un enlace normal a la misma
 *   dirección no hace nada), con animación salvo prefers-reduced-motion, y
 *   mueven el foco al título de la sección (h2 con tabIndex=-1, sin volver a
 *   desplazar) para que el teclado y los lectores de pantalla sigan ahí.
 * - Desde otra página: navegan a /#seccion; Next aterriza en la sección
 *   (debajo del header: scroll-padding-top en globals.css) y
 *   <SectionHashFocus /> mueve el foco al título.
 * Convención: la sección «x» tiene su título con id «x-title».
 */
import Link from "next/link";
import { useEffect, type ComponentProps, type MouseEvent } from "react";

import { ButtonLink } from "@/components/ui/Button";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function focusSectionTitle(section: string) {
  const title = document.getElementById(`${section}-title`);
  if (title && title.tabIndex === -1) title.focus({ preventScroll: true });
}

/** Desplaza hasta la sección de la página actual y enfoca su título. false si la sección no está aquí. */
export function scrollToSection(section: string): boolean {
  const target = document.getElementById(section);
  if (!target) return false;
  target.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "instant" : "smooth" });
  focusSectionTitle(section);
  return true;
}

/** onClick para un enlace a /#seccion: en la landing lo resuelve aquí mismo; fuera de ella, deja navegar. */
function sectionClick(section: string, onClick?: (event: MouseEvent<HTMLAnchorElement>) => void) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    // Abrir en otra pestaña o ventana: lo maneja el navegador.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (window.location.pathname !== "/") return;
    if (scrollToSection(section)) event.preventDefault();
  };
}

type SectionLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { section: string };

/** Enlace de texto a una sección de la landing (menú del header y del celular). */
export function SectionLink({ section, onClick, ...rest }: SectionLinkProps) {
  return <Link href={`/#${section}`} onClick={sectionClick(section, onClick)} {...rest} />;
}

type SectionButtonLinkProps = Omit<ComponentProps<typeof ButtonLink>, "href" | "external"> & { section: string };

/** Botón (mismo estilo que ButtonLink) que lleva a una sección de la landing. */
export function SectionButtonLink({ section, onClick, ...rest }: SectionButtonLinkProps) {
  return <ButtonLink href={`/#${section}`} onClick={sectionClick(section, onClick)} {...rest} />;
}

/**
 * Va en la landing: si se llega con #seccion (desde otra página o un enlace
 * compartido), el foco pasa al título de esa sección. Next ya desplazó hasta ella.
 */
export function SectionHashFocus() {
  useEffect(() => {
    const section = decodeURIComponent(window.location.hash.slice(1));
    if (section) focusSectionTitle(section);
  }, []);
  return null;
}
