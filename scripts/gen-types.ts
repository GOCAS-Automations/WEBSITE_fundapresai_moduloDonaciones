/**
 * Regenera lib/supabase/database.types.ts desde la Management API de Supabase.
 * Uso:  npm run db:types   (requiere SUPABASE_ACCESS_TOKEN y NEXT_PUBLIC_SUPABASE_URL)
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

import { loadLocalEnv, projectRef, requireEnv, ROOT } from "./lib/env";

async function main() {
  loadLocalEnv();
  const ref = projectRef(requireEnv("NEXT_PUBLIC_SUPABASE_URL"));
  const token = requireEnv("SUPABASE_ACCESS_TOKEN");
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/types/typescript?included_schemas=public`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Management API respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const { types } = (await res.json()) as { types: string };
  const header =
    "// Tipos de la base, generados con `npm run db:types` (Management API de Supabase).\n" +
    "// No editar a mano: regenerar después de cada migración.\n\n";
  const out = path.join(ROOT, "lib", "supabase", "database.types.ts");
  writeFileSync(out, header + types.trimEnd() + "\n");
  console.log(`Tipos escritos en ${path.relative(ROOT, out)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
