import { describe, expect, it } from "vitest";
import { parseRepoUrl } from "./repo-url";

describe("parseRepoUrl", () => {
  it("parses full URLs", () => expect(parseRepoUrl("https://github.com/vercel/next.js")).toEqual({ owner: "vercel", repo: "next.js" }));
  it("strips .git and subpaths", () => expect(parseRepoUrl("github.com/a/b.git/tree/main")).toEqual({ owner: "a", repo: "b" }));
  it("accepts owner/repo", () => expect(parseRepoUrl("facebook/react")).toEqual({ owner: "facebook", repo: "react" }));
  it("rejects other hosts", () => expect(parseRepoUrl("https://gitlab.com/a/b")).toBeNull());
});
