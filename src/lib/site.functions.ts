import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { askModel, extractJson, GRAPH_SPEC, USECASE_SPEC, ERD_SPEC } from "./ai.server";
import { normalizeSiteUrl } from "./site-url";
import type { SimpleEdge, SimpleNode } from "./flow";

async function get(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (OperoScanner)", Accept: "text/html,*/*" }, signal: AbortSignal.timeout(12000), redirect: "follow" });
  return res;
}

function strip(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export const scanWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ url: z.string().min(3).max(300) }).parse(d))
  .handler(async ({ data }) => {
    const u = normalizeSiteUrl(data.url);
    if (!u) throw new Error("Please enter a public website address, like app.example.com.");
    let res: Response;
    try { res = await get(u.href); } catch { throw new Error("Couldn't reach that website. Check the address and try again."); }
    if (!res.ok) throw new Error(`The website answered with an error (${res.status}).`);
    const html = (await res.text()).slice(0, 400000);
    const base = new URL(res.url || u.href);
    const root = base.hostname.split(".").slice(-2).join(".");
    const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? base.hostname;
    const links = new Set<string>();
    for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      try {
        const l = new URL(m[1]!, base);
        if (l.hostname.endsWith(root)) links.add(`${l.hostname}${l.pathname} :: ${strip(m[2] ?? "").slice(0, 40)}`);
      } catch { /* ignore */ }
      if (links.size > 120) break;
    }
    const forms = [...html.matchAll(/<form[\s\S]*?<\/form>/gi)].slice(0, 10).map((f) => {
      const action = /action=["']([^"']*)["']/i.exec(f[0])?.[1] ?? "";
      const inputs = [...f[0].matchAll(/<input[^>]*name=["']([^"']+)["'][^>]*>/gi)].map((i) => i[1]).join(", ");
      return `form action=${action} inputs=[${inputs}]`;
    });
    const apis = [...new Set([...html.matchAll(/["'`](\/api\/[^"'`\s]{1,80}|https?:\/\/[^"'`\s]*\/(?:api|graphql|rest)\/?[^"'`\s]{0,60})["'`]/gi)].map((m) => m[1]))].slice(0, 30);
    let sitemap = "";
    try {
      const s = await get(`${base.origin}/sitemap.xml`);
      if (s.ok) sitemap = [...(await s.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].slice(0, 80).map((m) => m[1]).join("\n");
    } catch { /* none */ }
    const text = await askModel(
      `You reverse-engineer a live website into an Opero project. From the page, links, forms, sitemap and API calls, infer its pages, user journeys and likely backend.
Return JSON only: {"project_name":"...","summary":"one sentence","workflows":[{"name":"Page or journey name","category":"page|feature|usecase|erd","graph":{...}}]}
Page and journey graphs follow: ${GRAPH_SPEC}
ALSO add one workflow "Use cases" (category usecase) following: ${USECASE_SPEC}
ALSO add one workflow "Inferred database" (category erd) following: ${ERD_SPEC}
Produce 3-7 page/journey workflows plus those extras.`,
      [{ role: "user", content: `URL: ${base.href}\nTitle: ${title}\nText: ${strip(html).slice(0, 3000)}\nLinks:\n${[...links].join("\n")}\nForms:\n${forms.join("\n")}\nAPI calls:\n${apis.join("\n")}\nSitemap:\n${sitemap}` }],
    );
    const out = extractJson<{ project_name: string; summary: string; workflows: { name: string; category: string; graph: { nodes: SimpleNode[]; edges: SimpleEdge[] } }[] }>(text);
    return { ...out, url: base.href, pages: links.size };
  });
