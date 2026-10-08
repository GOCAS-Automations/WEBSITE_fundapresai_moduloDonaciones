/**
 * Resultado que devuelven las Server Actions del panel a los formularios.
 * `at` cambia en cada respuesta para que el mensaje se anuncie de nuevo
 * (aria-live) aunque el texto sea el mismo.
 */
export type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
  /** Errores por campo: clave = nombre del input (p. ej. «stats.0.value»). */
  fieldErrors?: Record<string, string>;
  at?: number;
};

export const IDLE: ActionState = { status: "idle", message: "" };

export function ok(message: string): ActionState {
  return { status: "success", message, at: Date.now() };
}

export function fail(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { status: "error", message, fieldErrors, at: Date.now() };
}

/** Mensajes de las verificaciones de acceso (iguales en todo el panel). */
export const ACCESS_MESSAGES = {
  "sin-sesion": "Su sesión se cerró. Vuelva a entrar con su usuario y contraseña e intente de nuevo.",
  "no-admin":
    "Su cuenta no tiene permiso para hacer cambios en el sitio. Si cree que es un error, escriba a GOCAS.",
} as const;

export const VALIDATION_MESSAGE = "Revise los campos marcados en rojo: hay datos por corregir.";
