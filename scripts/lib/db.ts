/** Conexión directa a Postgres para los scripts locales (SUPABASE_DB_URL, Session pooler). */
import { readFileSync } from "node:fs";

import type { ClientConfig } from "pg";

import { requireEnv } from "./env";

/**
 * SSL siempre activo. Para verificar además el certificado del servidor,
 * defina SUPABASE_DB_CA_CERT=<ruta al .crt de Supabase>.
 */
export function pgClientConfig(applicationName: string): ClientConfig {
  const url = new URL(requireEnv("SUPABASE_DB_URL"));
  // sslmode en la URL anularía la opción ssl de abajo: se controla aquí.
  url.searchParams.delete("sslmode");
  const caPath = process.env.SUPABASE_DB_CA_CERT?.trim();
  return {
    connectionString: url.toString(),
    ssl: caPath ? { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true } : { rejectUnauthorized: false },
    application_name: applicationName,
    statement_timeout: 120_000,
  };
}
