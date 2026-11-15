import { describe, expect, it } from "vitest";
import { normalizeSiteUrl } from "./site-url";

describe("normalizeSiteUrl", () => {
  it("adds https to a bare subdomain", () => expect(normalizeSiteUrl("admin.example.com")?.href).toBe("https://admin.example.com/"));
  it("rejects localhost", () => expect(normalizeSiteUrl("http://localhost:3000")).toBeNull());
  it("rejects private IPs", () => expect(normalizeSiteUrl("192.168.1.4")).toBeNull());
});
