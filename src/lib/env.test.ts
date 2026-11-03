import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { parseEnv, publicEnv } from "./env";

describe("parseEnv", () => {
  const schema = z.object({ SECRET_KEY: z.string().min(10), SITE_URL: z.url() });

  it("mengembalikan nilai yang valid", () => {
    expect(parseEnv(schema, { SECRET_KEY: "abcdefghijk", SITE_URL: "http://localhost:3000" })).toEqual({
      SECRET_KEY: "abcdefghijk",
      SITE_URL: "http://localhost:3000",
    });
  });

  it("pesan galat menyebut nama variabel tanpa membocorkan nilainya", () => {
    const run = () => parseEnv(schema, { SECRET_KEY: "rahasia-pendek", SITE_URL: "bukan-url" });
    expect(run).toThrow(/SITE_URL/);
    try {
      run();
    } catch (error) {
      expect(String(error)).not.toContain("bukan-url");
      expect(String(error)).not.toContain("rahasia-pendek");
    }
  });
});

describe("publicEnv", () => {
  const base = {
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  };

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function stub(anonKey: string) {
    for (const [name, value] of Object.entries({ ...base, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey })) {
      vi.stubEnv(name, value);
    }
  }

  it("menerima kunci publishable", () => {
    stub("sb_publishable_contoh");
    expect(publicEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("sb_publishable_contoh");
  });

  it("menolak kunci secret di variabel publik", () => {
    stub("sb_secret_contoh");
    expect(() => publicEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });
});
