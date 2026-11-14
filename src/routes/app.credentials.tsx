import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/credentials")({ component: Creds });

function Creds() {
  const qc = useQueryClient(); const [name, setName] = useState(""); const [kind, setKind] = useState("api_key");
  const { data } = useQuery({ queryKey: ["creds"], queryFn: async () => (await supabase.from("credentials").select("*").order("created_at")).data ?? [] });
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
      <h1 className="text-3xl font-bold">Credentials</h1><p className="text-sm text-muted-foreground">Named references to the services your workflows use.</p>
      <form onSubmit={async (e) => { e.preventDefault(); if (!name) return; await supabase.from("credentials").insert({ name, kind }); setName(""); qc.invalidateQueries({ queryKey: ["creds"] }); }} className="flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Slack HR bot" className="h-10 flex-1 rounded-xl border bg-card px-3 text-sm" />
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-10 rounded-xl border bg-card px-3 text-sm"><option value="api_key">API key</option><option value="oauth">OAuth</option><option value="webhook">Webhook</option></select>
        <button className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Add</button></form>
      <div className="space-y-2">{data?.map((c) => <div key={c.id} className="flex items-center gap-3 rounded-xl border bg-card p-3"><KeyRound className="size-4 text-primary" /><span className="flex-1 text-sm font-medium">{c.name}</span><span className="text-xs text-muted-foreground">{c.kind}</span>
        <button aria-label="Delete" onClick={async () => { await supabase.from("credentials").delete().eq("id", c.id); qc.invalidateQueries({ queryKey: ["creds"] }); }}><Trash2 className="size-4 text-muted-foreground" /></button></div>)}</div>
    </div>
  );
}
