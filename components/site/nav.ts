/** Enlaces del menú principal (plan §5.1). Con «/» delante funcionan desde cualquier página. */
export const MAIN_NAV = [
  { href: "/#campanas", label: "Campañas" },
  { href: "/#quienes-somos", label: "Quiénes somos" },
  { href: "/#como-donar", label: "Cómo donar" },
] as const;

/** Enlace extra del menú del celular: el bloque de ayuda por WhatsApp. */
export const HELP_NAV = { href: "/#ayuda", label: "Ayuda para donar" } as const;
