import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { assertDevTestTarget } from "./tests/db/guard";

// Uji database terhadap project Supabase dev (npm run test:db).
// Penjaga dijalankan saat config dimuat, sebelum satu uji pun berjalan.
const root = fileURLToPath(new URL(".", import.meta.url));
const readIfExists = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : null);

const target = assertDevTestTarget({
  processEnv: process.env,
  envFile: readIfExists(`${root}.env.local`),
  linkedRef: readIfExists(`${root}supabase/.temp/project-ref`),
});

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/db/**/*.db.test.ts"],
    passWithNoTests: true,
    fileParallelism: false,
    testTimeout: 30_000,
    env: {
      TEST_SUPABASE_URL: target.url,
      TEST_SUPABASE_ANON_KEY: target.anonKey,
      TEST_SUPABASE_SERVICE_ROLE_KEY: target.serviceRoleKey,
    },
  },
});
