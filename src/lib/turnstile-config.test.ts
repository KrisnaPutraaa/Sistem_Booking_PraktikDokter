import { describe, expect, it } from "vitest";
import {
  isTurnstileTestKey,
  resolveTurnstileKeys,
  TURNSTILE_TEST_SECRET_KEY,
  TURNSTILE_TEST_SITE_KEY,
} from "./turnstile-config";

const REAL = { NEXT_PUBLIC_TURNSTILE_SITE_KEY: "0x4AAAAAAA-site", TURNSTILE_SECRET_KEY: "0x4AAAAAAA-secret" };

describe("resolveTurnstileKeys", () => {
  it("memakai kunci uji Cloudflare di development bila kunci kosong", () => {
    expect(resolveTurnstileKeys({ NODE_ENV: "development" })).toEqual({
      siteKey: TURNSTILE_TEST_SITE_KEY,
      secretKey: TURNSTILE_TEST_SECRET_KEY,
      testMode: true,
    });
  });

  it("memakai kunci uji di Preview Vercel", () => {
    expect(resolveTurnstileKeys({ NODE_ENV: "production", VERCEL_ENV: "preview" }).testMode).toBe(true);
  });

  it("gagal tertutup di produksi tanpa kunci", () => {
    expect(() => resolveTurnstileKeys({ NODE_ENV: "production", VERCEL_ENV: "production" })).toThrow(
      /NEXT_PUBLIC_TURNSTILE_SITE_KEY/,
    );
    expect(() => resolveTurnstileKeys({ NODE_ENV: "production" })).toThrow();
  });

  it("menolak kunci uji di produksi", () => {
    expect(() =>
      resolveTurnstileKeys({
        NODE_ENV: "production",
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: TURNSTILE_TEST_SITE_KEY,
        TURNSTILE_SECRET_KEY: TURNSTILE_TEST_SECRET_KEY,
      }),
    ).toThrow(/produksi/);
  });

  it("menolak bila hanya satu kunci diisi, tanpa menyebut nilainya", () => {
    expect(() =>
      resolveTurnstileKeys({ NODE_ENV: "development", NEXT_PUBLIC_TURNSTILE_SITE_KEY: REAL.NEXT_PUBLIC_TURNSTILE_SITE_KEY }),
    ).toThrow(/^Variabel lingkungan tidak ada: TURNSTILE_SECRET_KEY$/);
  });

  it("memakai kunci asli di produksi", () => {
    expect(resolveTurnstileKeys({ NODE_ENV: "production", VERCEL_ENV: "production", ...REAL })).toEqual({
      siteKey: REAL.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      secretKey: REAL.TURNSTILE_SECRET_KEY,
      testMode: false,
    });
  });
});

describe("isTurnstileTestKey", () => {
  it("mengenali kunci uji", () => {
    expect(isTurnstileTestKey("1x00000000000000000000AA")).toBe(true);
    expect(isTurnstileTestKey("2x0000000000000000000000000000000AA")).toBe(true);
    expect(isTurnstileTestKey("0x4AAAAAAABkMYinukE8nzY")).toBe(false);
  });
});
