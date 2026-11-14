import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { askModel, extractJson, GRAPH_SPEC } from "./ai.server";
import { parseRepoUrl } from "./repo-url";
import type { SimpleEdge, SimpleNode } from "./flow";

async function gh(path: string) {
  const res = await fetch(`https://api.github.com/${path}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "opero-app" },
  });
  if (res.status === 404) throw new Error("Repository not found. Make sure it is public and the link is correct.");
  if (res.status === 403) throw new Error("GitHub rate limit reached. Please try again in a few minutes.");
  if (!res.ok) throw new Error(`GitHub request failed (${res.status}).`);
  return res.json();
}

export const analyzeRepo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ url: z.string().min(3).max(300) }).parse(d))
  .handler(async ({ data }) => {
    const parsed = parseRepoUrl(data.url);
    if (!parsed) throw new Error("That doesn't look like a GitHub repository link.");
    const meta = await gh(`repos/${parsed.owner}/${parsed.repo}`);
    const tree = await gh(`repos/${parsed.owner}/${parsed.repo}/git/trees/${meta.default_branch}?recursive=1`);
    const paths: string[] = (tree.tree ?? [])
      .filter((t: { type: string; path: string }) => t.type === "blob" && !/node_modules|\.lock|dist\/|\.png|\.jpg|\.svg|\.ico/.test(t.path))
      .map((t: { path: string }) => t.path);
    let readme = "";
    try {
      const r = await gh(`repos/${parsed.owner}/${parsed.repo}/readme`);
      readme = atob(String(r.content).replace(/\n/g, "")).slice(0, 4000);
    } catch { /* no readme */ }
    const text = await askModel(
      `You analyze a software repository and map it into an Opero project. Identify the main pages/screens and the main functionalities (user flows, APIs, jobs). For each, produce a workflow graph describing how it works end to end.
Return JSON only: {"project_name":"...","summary":"one sentence","workflows":[{"name":"Page or feature name","category":"page|feature","graph":{...}}]}
Each graph follows: ${GRAPH_SPEC}
Produce 3-8 workflows.`,
      [{ role: "user", content: `Repo: ${meta.full_name}\nDescription: ${meta.description ?? ""}\nLanguage: ${meta.language ?? ""}\nFiles (${paths.length}):\n${paths.slice(0, 400).join("\n")}\n\nREADME:\n${readme}` }],
    );
    const out = extractJson<{ project_name: string; summary: string; workflows: { name: string; category: string; graph: { nodes: SimpleNode[]; edges: SimpleEdge[] } }[] }>(text);
    return { ...out, repo: meta.full_name as string, url: meta.html_url as string, fileCount: paths.length };
  });
