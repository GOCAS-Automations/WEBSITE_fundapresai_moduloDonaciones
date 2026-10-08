/**
 * FormData → objeto anidado para validar con Zod.
 * Los nombres con puntos e índices arman objetos y listas:
 *   «stats.0.value» = "108"  →  { stats: [{ value: "108" }] }
 * Los campos internos de React/Next («$ACTION_…») se ignoran.
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const [name, raw] of formData.entries()) {
    if (name.startsWith("$")) continue;
    const value = typeof raw === "string" ? raw : "";
    const keys = name.split(".");
    let node: Record<string, unknown> | unknown[] = root;
    keys.forEach((key, i) => {
      const last = i === keys.length - 1;
      const nextIsIndex = !last && /^\d+$/.test(keys[i + 1]);
      const slot = /^\d+$/.test(key) && Array.isArray(node) ? Number(key) : key;
      const container = node as Record<string | number, unknown>;
      if (last) {
        container[slot] = value;
      } else {
        container[slot] ??= nextIsIndex ? [] : {};
        node = container[slot] as Record<string, unknown> | unknown[];
      }
    });
  }
  return root;
}

/** Quita de una lista las filas cuyos campos están todos vacíos (p. ej. una cifra sin llenar). */
export function dropEmptyRows<T extends Record<string, unknown>>(rows: unknown): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter(
    (row): row is T =>
      typeof row === "object" &&
      row !== null &&
      Object.values(row).some((v) => typeof v === "string" && v.trim() !== ""),
  );
}
