/**
 * Enlaces del menú principal (plan §5.1): secciones de la landing. Se usan con
 * <SectionLink section=…>, que funciona desde cualquier página (ver SectionLinks.tsx).
 */
export const MAIN_NAV = [
  { section: "campanas", label: "Campañas" },
  { section: "quienes-somos", label: "Quiénes somos" },
  { section: "como-donar", label: "Cómo donar" },
] as const;

/** Enlace extra del menú del celular: el bloque de ayuda por WhatsApp. */
export const HELP_NAV = { section: "ayuda", label: "Ayuda para donar" } as const;
