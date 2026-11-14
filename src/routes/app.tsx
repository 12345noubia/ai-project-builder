import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3, Bell, ChevronDown, Database, Github, HelpCircle, Home, KeyRound, Loader2, LogOut, Menu, MessageSquare, Plus,
  Search, Settings, Sparkles, Workflow, X, FolderKanban,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/app/Logo";
import { AiProvider, useAi } from "@/components/app/AiPanel";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { createProject, useInvalidate, useProjects, useWorkflows } from "@/lib/queries";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "Workspace — Opero" }, { name: "description", content: "Your Opero workspace." }] }),
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user, nav]);
  if (loading || !user) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  return <AiProvider><Shell /></AiProvider>;
}

const overview = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/workflows", label: "Workflow", icon: Workflow },
  { to: "/app/credentials", label: "Credentials", icon: KeyRound },
  { to: "/app/data", label: "Data Table", icon: Database },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
] as const;
const tools = [
  { to: "/app/integrations", label: "GitHub Import", icon: Github },
  { to: "/app/settings", label: "Settings", icon: Settings },
  { to: "/app/help", label: "Help Centre", icon: HelpCircle },
] as const;

function Shell() {
  const [mobile, setMobile] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => setMobile(false), [path]);
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r bg-sidebar transition-transform lg:static lg:translate-x-0 ${mobile ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar onClose={() => setMobile(false)} />
      </aside>
      {mobile && <div className="fixed inset-0 z-30 bg-foreground/30 lg:hidden" onClick={() => setMobile(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setMobile(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto"><Outlet /></main>
      </div>
    </div>
  );
}

function Sidebar({ onClose }: { onClose: () => void }) {
  const { data: projects } = useProjects();
  const { data: workflows } = useWorkflows();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [openP, setOpenP] = useState<Record<string, boolean>>({});
  const inv = useInvalidate();
  const nav = useNavigate();
  const hits = q ? (workflows ?? []).filter((w) => w.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];

  async function addProject() {
    const name = prompt("Project name");
    if (!name) return;
    try { await createProject(name); inv(); toast.success("Project created"); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center justify-between">
        <Link to="/"><Logo /></Link>
        <button aria-label="Close menu" onClick={onClose} className="rounded-lg p-1.5 hover:bg-sidebar-accent lg:hidden"><X className="size-4" /></button>
      </div>
      <div className="relative mt-5">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search workflows…" className="h-9 w-full rounded-xl border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        {hits.length > 0 && (
          <div className="absolute inset-x-0 top-10 z-10 rounded-xl border bg-popover p-1 shadow-soft">
            {hits.map((h) => <button key={h.id} onClick={() => { setQ(""); nav({ to: "/app/workflow/$id", params: { id: h.id } }); }} className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent">{h.name}</button>)}
          </div>
        )}
      </div>
      <nav className="mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto">
        <Group title="Overview">{overview.map((l) => <NavItem key={l.to} {...l} />)}</Group>
        <div>
          <div className="mb-1.5 flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Projects <button aria-label="Add project" onClick={addProject} className="grid size-5 place-items-center rounded-full border hover:bg-card"><Plus className="size-3" /></button>
          </div>
          {(projects ?? []).map((p) => {
            const ws = (workflows ?? []).filter((w) => w.project_id === p.id);
            const open = openP[p.id] ?? false;
            return (
              <div key={p.id}>
                <button onClick={() => setOpenP({ ...openP, [p.id]: !open })} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-sidebar-accent">
                  {p.source_repo ? <Github className="size-4 text-muted-foreground" /> : <FolderKanban className="size-4 text-muted-foreground" />}
                  <span className="flex-1 truncate text-left font-medium">{p.name}</span>
                  <ChevronDown className={`size-3.5 transition ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <div className="ml-4 border-l pl-2">
                    {ws.map((w) => <Link key={w.id} to="/app/workflow/$id" params={{ id: w.id }} className="block truncate rounded-md px-2 py-1 text-[13px] text-muted-foreground hover:text-foreground" activeProps={{ className: "text-primary font-medium" }}>{w.name}</Link>)}
                    {ws.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">No workflows</p>}
                  </div>
                )}
              </div>
            );
          })}
          {projects?.length === 0 && <p className="px-2 text-xs text-muted-foreground">No projects yet</p>}
        </div>
        <Group title="Tools">{tools.map((l) => <NavItem key={l.to} {...l} />)}</Group>
      </nav>
      <div className="mt-3 flex items-center gap-3 rounded-2xl border bg-card p-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">{(user?.email ?? "U").charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{(user?.user_metadata?.["full_name"] as string) || user?.email?.split("@")[0]}</p><p className="truncate text-xs text-muted-foreground">{user?.email}</p></div>
        <button aria-label="Sign out" onClick={() => supabase.auth.signOut()} className="rounded-lg p-1.5 hover:bg-muted"><LogOut className="size-4" /></button>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p><div className="space-y-0.5">{children}</div></div>;
}

function NavItem({ to, label, icon: Icon, exact }: { to: string; label: string; icon: typeof Home; exact?: boolean }) {
  return (
    <Link to={to} activeOptions={{ exact: !!exact }} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
      activeProps={{ className: "bg-sidebar-accent font-semibold text-foreground" }}>
      <Icon className="size-4" /> {label}
    </Link>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const ai = useAi();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const crumbs = path.split("/").filter(Boolean).slice(1).filter((c) => !/^[0-9a-f-]{20,}$/.test(c));
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
      <button aria-label="Open menu" onClick={onMenu} className="rounded-lg p-1.5 hover:bg-muted lg:hidden"><Menu className="size-5" /></button>
      <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        Workspace{crumbs.map((c, i) => <span key={i}> / <span className={i === crumbs.length - 1 ? "font-semibold text-foreground" : ""}>{c.charAt(0).toUpperCase() + c.slice(1)}</span></span>)}
      </p>
      <button aria-label="Chat" onClick={() => ai.open()} className="hidden size-9 place-items-center rounded-full border hover:bg-muted sm:grid"><MessageSquare className="size-4" /></button>
      <button aria-label="Notifications" onClick={() => toast("You're all caught up")} className="hidden size-9 place-items-center rounded-full border hover:bg-muted sm:grid"><Bell className="size-4" /></button>
      <button onClick={() => ai.open("Give me an insight about my current workflow and what to improve.")} className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary">
        <span className="hidden sm:inline">Get AI Insight</span><Sparkles className="size-4" />
      </button>
    </header>
  );
}
