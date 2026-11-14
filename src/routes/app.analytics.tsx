import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useRuns } from "@/lib/queries";

export const Route = createFileRoute("/app/analytics")({ component: Analytics });

function Analytics() {
  const { data } = useRuns();
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() - (6 - i) * 864e5); const k = d.toDateString();
    return { day: d.toLocaleDateString(undefined, { weekday: "short" }), runs: (data ?? []).filter((r) => new Date(r.created_at).toDateString() === k).length }; });
  const ok = (data ?? []).filter((r) => r.status === "success").length;
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <h1 className="text-3xl font-bold">Analytics</h1>
      <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">Total runs</p><p className="text-3xl font-bold">{data?.length ?? 0}</p></div>
        <div className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">Success rate</p><p className="text-3xl font-bold">{data?.length ? Math.round((ok / data.length) * 100) : 0}%</p></div></div>
      <div className="h-72 rounded-2xl border bg-card p-5"><ResponsiveContainer><BarChart data={days}><XAxis dataKey="day" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Bar dataKey="runs" fill="var(--primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
    </div>
  );
}
