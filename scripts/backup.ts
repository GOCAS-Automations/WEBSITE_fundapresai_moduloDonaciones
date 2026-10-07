/**
 * Exporta campaigns y site_settings a JSON (plan §10, copias de seguridad).
 *
 * Uso local:  npm run backup                 → backups/AAAA-MM-DD_HHMM/ (ignorado por git)
 *             npm run backup -- --out <dir>  → escribe en <dir>
 * En GitHub:  .github/workflows/backup.yml (semanal) lo corre con --out y hace
 *             commit en la rama «backups».
 *
 * Sin dependencias: usa fetch contra la API REST de Supabase con la clave
 * secreta. Variables: SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y
 * SUPABASE_SERVICE_ROLE_KEY. Cómo restaurar: ver README.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { loadLocalEnv, projectRef, requireEnv, ROOT, supabaseKeyHeaders } from "./lib/env";

const TABLES = [
  { name: "campaigns", query: "select=*&order=sort_order.asc,created_at.asc" },
  { name: "site_settings", query: "select=*&order=id.asc" },
] as const;

function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

async function main() {
  loadLocalEnv();
  const url = requireEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const outIndex = process.argv.indexOf("--out");
  const outDir =
    outIndex > -1 && process.argv[outIndex + 1]
      ? path.resolve(process.argv[outIndex + 1])
      : path.join(ROOT, "backups", stamp());
  mkdirSync(outDir, { recursive: true });

  const rowsPerTable: Record<string, number> = {};
  for (const table of TABLES) {
    const res = await fetch(`${url}/rest/v1/${table.name}?${table.query}`, {
      headers: { ...supabaseKeyHeaders(key), Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`No se pudo exportar ${table.name}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    const rows = (await res.json()) as unknown[];
    writeFileSync(path.join(outDir, `${table.name}.json`), JSON.stringify(rows, null, 2) + "\n");
    rowsPerTable[table.name] = rows.length;
  }

  writeFileSync(
    path.join(outDir, "meta.json"),
    JSON.stringify({ project_ref: projectRef(url), exported_at: new Date().toISOString(), rows: rowsPerTable }, null, 2) +
      "\n",
  );
  const resumen = Object.entries(rowsPerTable)
    .map(([t, n]) => `${t}=${n}`)
    .join(", ");
  console.log(`Respaldo en ${outDir}: ${resumen}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
