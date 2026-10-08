import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // La clave secreta de Supabase solo se usa en el latido y en la gestión de
  // usuarios del panel (lib/supabase/service-role.ts explica por qué).
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["app/api/heartbeat/route.ts", "lib/admin/accounts.ts", "lib/supabase/service-role.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/supabase/service-role", "@/lib/supabase/service-role"],
              message:
                "La clave secreta solo se usa en app/api/heartbeat/route.ts y lib/admin/accounts.ts (después de verificar al administrador general).",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
