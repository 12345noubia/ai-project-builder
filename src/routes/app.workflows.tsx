import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createProject, createWorkflow, useDeleteProject, useInvalidate, useProjects, useWorkflows } from "@/lib/queries";

export const Route = createFileRoute("/app/workflows")({ component: WorkflowsPage });

function WorkflowsPage() {
  const { data: p } = useProjects(); const { data: w } = useWorkflows(); const inv = useInvalidate(); const nav = useNavigate(); const del = useDeleteProject();
  const [name, setName] = useState("");
  async function add(projectId?: string) {
    const n = name.trim() || "Untitled workflow";
    try { const pid = projectId ?? p?.[0]?.id ?? (await createProject("My Project")).id; const wf = await createWorkflow(pid, n); inv(); nav({ to: "/app/workflow/$id", params: { id: wf.id } }); }
    catch (e) { toast.error((e as Error).message); }
  }
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-center gap-2"><h1 className="flex-1 text-3xl font-bold">All Workflows</h1>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New workflow name" className="h-10 rounded-xl border bg-card px-3 text-sm" />
        <button onClick={() => add()} className="inline-flex h-10 items-center gap-1 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus className="size-4" />New</button></div>
      {(p ?? []).map((pr) => (
        <div key={pr.id} className="rounded-2xl border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2"><h2 className="flex-1 font-semibold">{pr.name}</h2>
            <button onClick={() => add(pr.id)} className="text-sm text-primary">+ Add</button>
            <button aria-label="Delete project" onClick={() => confirm("Delete project and its workflows?") && del.mutate(pr.id)}><Trash2 className="size-4 text-muted-foreground" /></button></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{(w ?? []).filter((x) => x.project_id === pr.id).map((x) => (
            <div key={x.id} className="flex items-center rounded-xl border p-3"><Link to="/app/workflow/$id" params={{ id: x.id }} className="flex-1 text-sm font-medium hover:text-primary">{x.name}<span className="ml-2 text-xs text-muted-foreground">{x.status}</span></Link>
              <button aria-label="Delete" onClick={async () => { await supabase.from("workflows").delete().eq("id", x.id); inv(); }}><Trash2 className="size-3.5 text-muted-foreground" /></button></div>))}</div>
        </div>))}
    </div>
  );
}
