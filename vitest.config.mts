import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Uji fungsi murni (waktu, normalisasi WhatsApp, CSV). Belum perlu jsdom.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
