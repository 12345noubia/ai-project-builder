import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Github, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { analyzeRepo } from "@/lib/github.functions";
import { createProject, createWorkflow, useInvalidate } from "@/lib/queries";

export const Route = createFileRoute("/app/integrations")({ component: GithubImport });

function GithubImport() {
  const [url, setUrl] = useState(""); const [busy, setBusy] = useState(false); const [step, setStep] = useState("");
  const analyze = useServerFn(analyzeRepo); const inv = useInvalidate(); const nav = useNavigate();
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      setStep("Reading repository and mapping pages with AI…");
      const r = await analyze({ data: { url } });
      setStep("Creating workflows…");
      const p = await createProject(r.project_name || r.repo, "github", r.url);
      let first: string | null = null;
      for (const w of r.workflows) { const wf = await createWorkflow(p.id, w.name, w.graph); first ??= wf.id; }
      inv(); toast.success(`Imported ${r.workflows.length} workflows from ${r.repo}`);
      if (first) nav({ to: "/app/workflow/$id", params: { id: first } });
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false); setStep("");
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><Github className="size-6" /></span>
      <h1 className="text-3xl font-bold">Import a GitHub project</h1>
      <p className="text-muted-foreground">Paste a public repository link. Opero reads its files and README, then lays out its pages and features as workflows in a new project.</p>
      <form onSubmit={go} className="flex flex-col gap-2 sm:flex-row">
        <input required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/owner/repo" className="h-11 flex-1 rounded-xl border bg-card px-3 text-sm" />
        <button disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60">{busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}Analyze</button>
      </form>
      {step && <p className="text-sm text-primary">{step}</p>}
    </div>
  );
}
