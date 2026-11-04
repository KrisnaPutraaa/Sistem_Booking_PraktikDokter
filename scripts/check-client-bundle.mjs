// Daftar periksa bagian 8: kunci rahasia tidak boleh ada di file yang dikirim
// ke browser. Jalankan setelah `npm run build`: `npm run check:bundle`.
//
// Yang diperiksa: .next/static (JS/CSS klien) dan HTML/RSC hasil prerender di
// .next/server/app. Yang dicari: nama variabel rahasia, awalan kunci secret
// Supabase, kata service_role, dan NILAI kunci rahasia bila tersedia di
// environment atau .env.local. Nilai tidak pernah dicetak, hanya nama file.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

const root = new URL("..", import.meta.url).pathname;
const targets = [
  { dir: join(root, ".next/static"), exts: [".js", ".css", ".json", ".html"] },
  { dir: join(root, ".next/server/app"), exts: [".html", ".rsc", ".body", ".meta"] },
];

if (!existsSync(join(root, ".next/static"))) {
  console.error("Folder .next/static tidak ada. Jalankan npm run build dulu.");
  process.exit(2);
}

const envFile = existsSync(join(root, ".env.local")) ? parseEnv(readFileSync(join(root, ".env.local"), "utf8")) : {};
const SECRET_NAMES = ["SUPABASE_SERVICE_ROLE_KEY", "TURNSTILE_SECRET_KEY"];

const needles = [
  ...SECRET_NAMES.map((name) => ({ label: `nama ${name}`, value: name })),
  { label: "awalan sb_secret_", value: "sb_secret_" },
  { label: "kata service_role", value: "service_role" },
];
for (const name of SECRET_NAMES) {
  const value = process.env[name] || envFile[name];
  // Kunci uji Turnstile publik (1x000...) diabaikan; nilai pendek tidak bermakna.
  if (value && value.length >= 20) needles.push({ label: `nilai ${name}`, value });
}

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

let scanned = 0;
const findings = [];
for (const { dir, exts } of targets) {
  for (const file of walk(dir)) {
    if (!exts.some((ext) => file.endsWith(ext))) continue;
    scanned++;
    const text = readFileSync(file, "utf8");
    for (const needle of needles) {
      if (text.includes(needle.value)) findings.push(`${needle.label}: ${file.slice(root.length)}`);
    }
  }
}

const valueChecks = needles.filter((n) => n.label.startsWith("nilai")).length;
console.log(`Diperiksa ${scanned} file klien; ${needles.length} pola (${valueChecks} berupa nilai kunci).`);
if (findings.length > 0) {
  console.error("GAGAL: rahasia atau penandanya ditemukan di file klien:");
  for (const f of findings) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("Lulus: tidak ada kunci rahasia di file klien.");
