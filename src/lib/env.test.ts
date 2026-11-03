import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseEnv } from "./env";

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
