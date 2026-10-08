/**
 * Aplica en orden las migraciones pendientes de supabase/migrations/ y,
 * opcionalmente, el seed. Lleva su propia tabla de control:
 * app_meta.schema_migrations (nombre + checksum).
 *
 * Uso:
 *   npm run db:apply              aplica migraciones pendientes
 *   npm run db:apply -- --dry-run lista lo pendiente sin aplicar
 *   npm run db:seed               migraciones pendientes + seed.sql (idempotente)
 *
 * Requiere SUPABASE_DB_URL (Connect → Session pooler, puerto 5432) en .env.local.
 * SSL siempre activo. Para verificar además el certificado del servidor,
 * descargue el CA de Supabase (Database Settings → SSL) y defina
 * SUPABASE_DB_CA_CERT=<ruta al .crt>.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { Client } from "pg";

import { pgClientConfig } from "./lib/db";
import { loadLocalEnv, ROOT } from "./lib/env";

const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const SEED_FILE = path.join(ROOT, "supabase", "seed.sql");
const LOCK_KEY = 718_204_551; // pg_advisory_lock: evita dos ejecuciones simultáneas

function checksum(sql: string): string {
  return createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex");
}

function describePgError(err: unknown, sql: string): string {
  const e = err as { message?: string; position?: string; code?: string; detail?: string };
  let msg = `${e.code ? `[${e.code}] ` : ""}${e.message ?? String(err)}`;
  if (e.detail) msg += `\n  Detalle: ${e.detail}`;
  if (e.position) {
    const line = sql.slice(0, Number(e.position)).split("\n").length;
    msg += `\n  Línea aproximada: ${line}`;
  }
  return msg;
}

async function runInTransaction(client: Client, label: string, sql: string, after?: () => Promise<void>) {
  process.stdout.write(`Aplicando ${label} ... `);
  try {
    await client.query("begin");
    await client.query(sql);
    if (after) await after();
    await client.query("commit");
    console.log("ok");
  } catch (err) {
    await client.query("rollback");
    console.log("FALLÓ");
    throw new Error(`Error en ${label}: ${describePgError(err, sql)}`);
  }
}

async function main() {
  loadLocalEnv();
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const withSeed = args.has("--seed");

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort();

  const client = new Client(pgClientConfig("fundapresai-db-apply"));
  await client.connect();
  if (!process.env.SUPABASE_DB_CA_CERT) {
    console.log("Conexión con SSL (sin verificar la CA; defina SUPABASE_DB_CA_CERT para verificarla).");
  }

  try {
    await client.query("select pg_advisory_lock($1)", [LOCK_KEY]);

    await client.query(`
      create schema if not exists app_meta;
      revoke all on schema app_meta from public;
      create table if not exists app_meta.schema_migrations (
        name       text primary key,
        checksum   text not null,
        applied_at timestamptz not null default now()
      );
    `);

    const { rows } = await client.query<{ name: string; checksum: string }>(
      "select name, checksum from app_meta.schema_migrations",
    );
    const applied = new Map(rows.map((r) => [r.name, r.checksum]));

    const pending: { name: string; sql: string; sum: string }[] = [];
    for (const name of files) {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, name), "utf8");
      const sum = checksum(sql);
      const prev = applied.get(name);
      if (prev && prev !== sum) {
        throw new Error(`La migración ya aplicada «${name}» cambió. No edite migraciones aplicadas: cree una nueva.`);
      }
      if (!prev) pending.push({ name, sql, sum });
    }

    if (pending.length === 0) console.log("Sin migraciones pendientes.");
    for (const m of pending) {
      if (dryRun) {
        console.log(`Pendiente: ${m.name}`);
        continue;
      }
      await runInTransaction(client, m.name, m.sql, async () => {
        await client.query("insert into app_meta.schema_migrations (name, checksum) values ($1, $2)", [m.name, m.sum]);
      });
    }

    if (withSeed && !dryRun) {
      await runInTransaction(client, "seed.sql", readFileSync(SEED_FILE, "utf8"));
      const { rows: counts } = await client.query<{ campaigns: number; settings: number }>(
        "select (select count(*)::int from public.campaigns) as campaigns, (select count(*)::int from public.site_settings) as settings",
      );
      console.log(`Campañas: ${counts[0].campaigns} · site_settings: ${counts[0].settings}`);
    }
  } finally {
    await client.query("select pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => {});
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
