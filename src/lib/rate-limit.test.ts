import { describe, expect, it } from "vitest";
import { clientIpKey } from "./rate-limit";

const from = (h: Record<string, string>) => (name: string) => h[name] ?? null;

describe("clientIpKey", () => {
  it("mengutamakan header Vercel", () => {
    expect(clientIpKey(from({ "x-vercel-forwarded-for": "1.2.3.4", "x-forwarded-for": "9.9.9.9" }))).toBe("1.2.3.4");
    expect(clientIpKey(from({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIpKey(from({ "x-forwarded-for": "10.0.0.1, 172.16.0.1" }))).toBe("10.0.0.1");
  });

  it("IPv6 diringkas ke prefiks /64", () => {
    expect(clientIpKey(from({ "x-real-ip": "2001:db8:abcd:12:1:2:3:4" }))).toBe("2001:db8:abcd:12::/64");
    expect(clientIpKey(from({ "x-real-ip": "2001:DB8:0:0::1" }))).toBe("2001:db8:0:0::/64");
    expect(clientIpKey(from({ "x-real-ip": "2001:db8:abcd:12:ffff::" }))).toBe("2001:db8:abcd:12::/64");
  });

  it("nilai kosong atau aneh menjadi unknown", () => {
    expect(clientIpKey(from({}))).toBe("unknown");
    expect(clientIpKey(from({ "x-real-ip": "bukan-ip" }))).toBe("unknown");
    expect(clientIpKey(from({ "x-real-ip": "1:2:3" }))).toBe("unknown");
    expect(clientIpKey(from({ "x-real-ip": "<script>" }))).toBe("unknown");
  });
});
