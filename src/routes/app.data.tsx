import { createFileRoute } from "@tanstack/react-router";
import { useRuns } from "@/lib/queries";

export const Route = createFileRoute("/app/data")({ component: DataPage });

function DataPage() {
  const { data } = useRuns();
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <h1 className="text-3xl font-bold">Data Table</h1><p className="text-sm text-muted-foreground">Every workflow run you've executed.</p>
      <div className="overflow-x-auto rounded-2xl border bg-card"><table className="w-full text-sm"><thead className="bg-muted text-left text-muted-foreground"><tr><th className="p-3">Workflow</th><th className="p-3">Status</th><th className="p-3">Steps</th><th className="p-3">When</th></tr></thead>
        <tbody>{data?.map((r) => <tr key={r.id} className="border-t"><td className="p-3">{(r.workflows as { name: string } | null)?.name}</td><td className="p-3"><span className={r.status === "success" ? "text-success" : "text-destructive"}>{r.status}</span></td><td className="p-3">{Array.isArray(r.log) ? r.log.length : 0}</td><td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td></tr>)}</tbody></table>
        {data?.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No runs yet — open a workflow, switch to Debug and press Run test.</p>}</div>
    </div>
  );
}
