import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user } = useAuth(); const [name, setName] = useState((user?.user_metadata?.["full_name"] as string) ?? "");
  const [dark, setDark] = useState(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      <h1 className="text-3xl font-bold">Settings</h1>
      <div className="space-y-3 rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{user?.email}</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" className="h-10 w-full rounded-xl border bg-background px-3 text-sm" />
        <button onClick={async () => { const { error } = await supabase.auth.updateUser({ data: { full_name: name } }); error ? toast.error(error.message) : toast.success("Saved"); }} className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Save</button></div>
      <label className="flex items-center justify-between rounded-2xl border bg-card p-5 text-sm font-medium">Dark mode
        <input type="checkbox" checked={dark} onChange={(e) => { setDark(e.target.checked); document.documentElement.classList.toggle("dark", e.target.checked); }} /></label>
    </div>
  );
}
