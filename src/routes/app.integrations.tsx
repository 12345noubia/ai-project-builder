import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Github, Globe, Loader2, Sparkles, Database, Users, Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";
import { analyzeRepo } from "@/lib/github.functions";
import { scanWebsite } from "@/lib/site.functions";
import { createProject, createWorkflow, useInvalidate } from "@/lib/queries";

export const Route = createFileRoute("/app/integrations")({
  head: () => ({ meta: [{ title: "Import — Opero" }, { name: "description", content: "Map a GitHub repo or live website into workflows, use cases and database diagrams." }] }),
  component: ImportPage,
});

type Src = "github" | "website";

function ImportPage() {
  const [src, setSrc] = useState<Src>("github");
  const [url, setUrl] = useState(""); const [busy, setBusy] = useState(false); const [step, setStep] = useState("");
  const analyze = useServerFn(analyzeRepo); const scan = useServerFn(scanWebsite); const inv = useInvalidate(); const nav = useNavigate();
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      setStep(src === "github" ? "Reading repository, schema files and pages with AI…" : "Scanning the website's pages, forms and API calls with AI…");
      const r = src === "github" ? await analyze({ data: { url } }) : await scan({ data: { url } });
      setStep("Creating workflows and diagrams…");
      const p = await createProject(r.project_name || r.url, src, r.url);
      let first: string | null = null;
      for (const w of r.workflows) { const wf = await createWorkflow(p.id, w.name, w.graph); first ??= wf.id; }
      inv(); toast.success(`Imported ${r.workflows.length} diagrams`);
      if (first) nav({ to: "/app/workflow/$id", params: { id: first } });
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false); setStep("");
  }
  const Icon = src === "github" ? Github : Globe;
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      <div className="flex w-fit rounded-xl bg-muted p-1 text-sm">
        {(["github", "website"] as const).map((s) => (
          <button key={s} onClick={() => setSrc(s)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium ${src === s ? "bg-card shadow-soft" : "text-muted-foreground"}`}>
            {s === "github" ? <Github className="size-4" /> : <Globe className="size-4" />}{s === "github" ? "GitHub repo" : "Live website"}
          </button>
        ))}
      </div>
      <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><Icon className="size-6" /></span>
      <h1 className="text-3xl font-bold">{src === "github" ? "Import a GitHub project" : "Scan a live website"}</h1>
      <p className="text-muted-foreground">
        {src === "github"
          ? "Paste a public repository link. Opero reads its files, README and database schema, then lays out its pages, features, use cases and tables."
          : "Paste a website or subdomain (e.g. app.example.com). Opero maps its pages, forms and API calls into user journeys, use cases and an inferred database."}
      </p>
      <form onSubmit={go} className="flex flex-col gap-2 sm:flex-row">
        <input required value={url} onChange={(e) => setUrl(e.target.value)} placeholder={src === "github" ? "https://github.com/owner/repo" : "https://app.example.com"} className="h-11 flex-1 rounded-xl border bg-card px-3 text-sm" />
        <button disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60">{busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{src === "github" ? "Analyze" : "Scan"}</button>
      </form>
      {step && <p className="text-sm text-primary">{step}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        {[{ i: RouteIcon, t: "Pages & flows", d: "Each page or journey as a workflow." }, { i: Users, t: "Use cases", d: "Actors and what they can do." }, { i: Database, t: "Database ERD", d: "Tables, columns and relations." }].map((c) => (
          <div key={c.t} className="rounded-2xl border bg-card p-4 shadow-soft"><c.i className="size-5 text-primary" /><p className="mt-2 text-sm font-semibold">{c.t}</p><p className="text-xs text-muted-foreground">{c.d}</p></div>
        ))}
      </div>
    </div>
  );
}
