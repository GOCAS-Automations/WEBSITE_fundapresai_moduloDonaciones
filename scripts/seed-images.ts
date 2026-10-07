/**
 * Sube las portadas iniciales (supabase/seed-images/<slug>.webp) al bucket
 * público «media» y actualiza cover_image_url de cada campaña.
 *
 * Uso:  npm run seed:images             campañas sin portada o con portada del seed
 *       npm run seed:images -- --force  reemplaza cualquier portada
 *
 * Usa la clave secreta (SUPABASE_SERVICE_ROLE_KEY) en local; nunca en el navegador.
 * El nombre lleva un hash del contenido → URL inmutable, cacheable un año.
 * Las portadas se preparan antes con `npm run covers:prepare` y `npm run brand:assets`.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../lib/supabase/database.types";
import { loadLocalEnv, requireEnv, ROOT } from "./lib/env";

const DIR = path.join(ROOT, "supabase", "seed-images");
const BUCKET = "media";
const PREFIX = "campaigns";

async function main() {
  loadLocalEnv();
  const force = process.argv.includes("--force");
  const supabase = createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );

  const files = readdirSync(DIR).filter((f) => f.endsWith(".webp"));
  if (files.length === 0) throw new Error("No hay portadas .webp en supabase/seed-images/");

  let failures = 0;
  for (const file of files) {
    const slug = path.basename(file, ".webp");
    const body = readFileSync(path.join(DIR, file));
    const hash = createHash("sha256").update(body).digest("hex").slice(0, 10);
    const objectPath = `${PREFIX}/${slug}-${hash}.webp`;

    const { data: campaign, error: readError } = await supabase
      .from("campaigns")
      .select("id, cover_image_url")
      .eq("slug", slug)
      .maybeSingle();
    if (readError) throw new Error(`No se pudo leer la campaña ${slug}: ${readError.message}`);
    if (!campaign) {
      console.warn(`- ${slug}: no existe una campaña con ese slug; se omite.`);
      continue;
    }

    const current = campaign.cover_image_url;
    const isSeedCover = current?.includes(`/storage/v1/object/public/${BUCKET}/${PREFIX}/${slug}-`) ?? false;
    if (current && !isSeedCover && !force) {
      console.log(`- ${slug}: ya tiene una portada propia; se conserva (use --force para reemplazarla).`);
      continue;
    }

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, body, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });
    if (uploadError) {
      failures++;
      console.error(`- ${slug}: falló la subida: ${uploadError.message}`);
      continue;
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    const head = await fetch(pub.publicUrl, { method: "HEAD" });
    if (!head.ok) {
      failures++;
      console.error(`- ${slug}: la URL pública respondió ${head.status}`);
      continue;
    }

    const { error: updateError } = await supabase
      .from("campaigns")
      .update({ cover_image_url: pub.publicUrl })
      .eq("id", campaign.id);
    if (updateError) {
      failures++;
      console.error(`- ${slug}: no se pudo actualizar cover_image_url: ${updateError.message}`);
      continue;
    }
    console.log(
      `- ${slug}: ${objectPath} (${(body.length / 1024).toFixed(0)} KB, ${head.headers.get("content-type")})`,
    );
  }

  if (failures) {
    console.error(`${failures} portada(s) con error.`);
    process.exit(1);
  }
  console.log("Portadas listas.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
