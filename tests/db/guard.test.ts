import { describe, expect, it } from "vitest";
import { assertDevTestTarget } from "./guard";

const REF = "abcdefghijklmnopqrst";
const FILE = [
  `SUPABASE_DEV_PROJECT_REF=${REF}`,
  `NEXT_PUBLIC_SUPABASE_URL=https://${REF}.supabase.co`,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_contoh",
  "SUPABASE_SERVICE_ROLE_KEY=sb_secret_contoh",
].join("\n");
const ALLOW = { SUPABASE_ALLOW_TEST_DB: "1" };

describe("assertDevTestTarget", () => {
  it("lolos untuk project dev dengan izin di perintah", () => {
    const target = assertDevTestTarget({ processEnv: ALLOW, envFile: FILE, linkedRef: `${REF}\n` });
    expect(target.projectRef).toBe(REF);
    expect(target.url).toBe(`https://${REF}.supabase.co`);
  });

  it("menolak tanpa SUPABASE_ALLOW_TEST_DB=1", () => {
    expect(() => assertDevTestTarget({ processEnv: {}, envFile: FILE, linkedRef: null })).toThrow(/ALLOW_TEST_DB/);
    expect(() =>
      assertDevTestTarget({ processEnv: { SUPABASE_ALLOW_TEST_DB: "true" }, envFile: FILE, linkedRef: null }),
    ).toThrow(/ditolak/);
  });

  it("menolak izin yang disimpan di .env.local", () => {
    const file = `${FILE}\nSUPABASE_ALLOW_TEST_DB=1`;
    expect(() => assertDevTestTarget({ processEnv: ALLOW, envFile: file, linkedRef: null })).toThrow(/di perintah/);
  });

  it("menolak tanpa .env.local atau tanpa ref dev", () => {
    expect(() => assertDevTestTarget({ processEnv: ALLOW, envFile: null, linkedRef: null })).toThrow(/\.env\.local/);
    const file = FILE.replace(`SUPABASE_DEV_PROJECT_REF=${REF}`, "SUPABASE_DEV_PROJECT_REF=");
    expect(() => assertDevTestTarget({ processEnv: ALLOW, envFile: file, linkedRef: null })).toThrow(/DEV_PROJECT_REF/);
  });

  it("menolak URL project lain", () => {
    const file = FILE.replace(`https://${REF}.supabase.co`, "https://zzzzzzzzzzzzzzzzzzzz.supabase.co");
    expect(() => assertDevTestTarget({ processEnv: ALLOW, envFile: file, linkedRef: null })).toThrow(/project dev/);
  });

  it("menolak URL yang ditimpa variabel shell", () => {
    const processEnv = { ...ALLOW, NEXT_PUBLIC_SUPABASE_URL: "https://zzzzzzzzzzzzzzzzzzzz.supabase.co" };
    expect(() => assertDevTestTarget({ processEnv, envFile: FILE, linkedRef: null })).toThrow(/shell/);
  });

  it("menolak bila project ter-link berbeda", () => {
    expect(() =>
      assertDevTestTarget({ processEnv: ALLOW, envFile: FILE, linkedRef: "zzzzzzzzzzzzzzzzzzzz" }),
    ).toThrow(/ter-link/);
  });

  it("pesan galat tidak memuat kunci", () => {
    const processEnv = { ...ALLOW, SUPABASE_SERVICE_ROLE_KEY: "sb_secret_lain" };
    expect(() => assertDevTestTarget({ processEnv, envFile: FILE, linkedRef: null })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("sb_secret") }),
    );
  });
});
