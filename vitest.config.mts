import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Uji fungsi murni (waktu, normalisasi WhatsApp, CSV, penjaga test:db). Belum perlu jsdom.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // Uji database (*.db.test.ts) hanya lewat npm run test:db.
    exclude: ["tests/**/*.db.test.ts", "node_modules/**"],
  },
});
