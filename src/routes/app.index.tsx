import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Github, Plus, Workflow, Play, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { createProject, createWorkflow, useInvalidate, useProjects, useRuns, useWorkflows } from "@/lib/queries";
import { SAMPLE } from "@/lib/flow";

export const Route = createFileRoute("/app/")({ component: HomePage });

function HomePage() {
  const { data: p } = useProjects(); const { data: w } = useWorkflows(); const { data: r } = useRuns();
  const inv = useInvalidate(); const nav = useNavigate();
  async function sample() {
    try { const pr = await createProject("HR Management"); const wf = await createWorkflow(pr.id, "Employee Onboarding", SAMPLE); inv(); nav({ to: "/app/workflow/$id", params: { id: wf.id } }); }
    catch (e) { toast.error((e as Error).message); }
  }
  const stats = [{ l: "Projects", v: p?.length ?? 0, i: FolderKanban }, { l: "Workflows", v: w?.length ?? 0, i: Workflow }, { l: "Runs", v: r?.length ?? 0, i: Play }];
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <h1 className="text-3xl font-bold">Welcome back</h1>
      <div className="grid gap-4 sm:grid-cols-3">{stats.map((s) => <div key={s.l} className="rounded-2xl border bg-card p-5 shadow-soft"><s.i className="size-5 text-primary" /><p className="mt-3 text-3xl font-bold">{s.v}</p><p className="text-sm text-muted-foreground">{s.l}</p></div>)}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <button onClick={sample} className="rounded-2xl border bg-card p-5 text-left shadow-soft hover:border-primary"><Plus className="size-5 text-primary" /><p className="mt-3 font-semibold">Create sample HR project</p><p className="text-sm text-muted-foreground">An employee onboarding workflow to explore.</p></button>
        <Link to="/app/integrations" className="rounded-2xl border bg-card p-5 shadow-soft hover:border-primary"><Github className="size-5 text-primary" /><p className="mt-3 font-semibold">Import a GitHub repo</p><p className="text-sm text-muted-foreground">Map its pages and features into workflows.</p></Link>
      </div>
      <div className="rounded-2xl border bg-card p-5 shadow-soft"><h2 className="font-semibold">Recent workflows</h2>
        <div className="mt-3 divide-y">{(w ?? []).slice(0, 6).map((x) => <Link key={x.id} to="/app/workflow/$id" params={{ id: x.id }} className="flex justify-between py-2.5 text-sm hover:text-primary"><span>{x.name}</span><span className="text-muted-foreground">{x.status}</span></Link>)}
          {w?.length === 0 && <p className="py-3 text-sm text-muted-foreground">Nothing yet.</p>}</div></div>
    </div>
  );
}
