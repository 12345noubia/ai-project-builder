import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow, Background, BackgroundVariant, ReactFlowProvider, useReactFlow, addEdge, applyEdgeChanges, applyNodeChanges,
  type Connection, type Edge, type EdgeChange, type NodeChange,
} from "@xyflow/react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft, Check, Hand, LayoutGrid, Loader2, MousePointer2, Minus, Plus, Play, Redo2, RefreshCw, Sparkles, Trash2, Undo2, Wand2, X, Bot,
} from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { FlowNodeCard, KIND_ICON } from "@/components/app/FlowNodeCard";
import { useAi } from "@/components/app/AiPanel";
import { KIND_META, NODE_KINDS, layout, makeEdge, type FlowNode, type NodeKind } from "@/lib/flow";
import { generateWorkflow } from "@/lib/ai.functions";
import { useInvalidate } from "@/lib/queries";

export const Route = createFileRoute("/app/workflow/$id")({
  head: () => ({ meta: [{ title: "Workflow builder — Opero" }, { name: "description", content: "Edit and debug your workflow." }] }),
  component: () => <ReactFlowProvider><Editor /></ReactFlowProvider>,
});

const nodeTypes = { flow: FlowNodeCard };
type Snap = { nodes: FlowNode[]; edges: Edge[] };
type LogLine = { node: string; title: string; status: "ok" | "stop"; at: string };

function Editor() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const rf = useReactFlow();
  const ai = useAi();
  const inv = useInvalidate();
  const gen = useServerFn(generateWorkflow);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("draft");
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [selected, setSelected] = useState<string | null>(null);
  const [pan, setPan] = useState(true);
  const [mode, setMode] = useState<"builder" | "debug">("builder");
  const [zoom, setZoom] = useState(0.8);
  const [log, setLog] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const [genBusy, setGenBusy] = useState(false);
  const past = useRef<Snap[]>([]);
  const future = useRef<Snap[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("workflows").select("*").eq("id", id).maybeSingle();
      if (error || !data) { toast.error("Workflow not found"); nav({ to: "/app/workflows" }); return; }
      setName(data.name); setStatus(data.status);
      setNodes((data.nodes as unknown as FlowNode[]) ?? []); setEdges((data.edges as unknown as Edge[]) ?? []);
      setLoaded(true);
      setTimeout(() => rf.fitView({ padding: 0.2, maxZoom: 1 }), 50);
    })();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // context for AI copilot
  useEffect(() => {
    ai.setContext(JSON.stringify({ name, nodes: nodes.map((n) => ({ id: n.id, ...n.data, running: undefined, done: undefined })), edges: edges.map((e) => ({ s: e.source, t: e.target, l: e.label })) }).slice(0, 18000));
    return () => ai.setContext(undefined);
  }, [nodes, edges, name]); // eslint-disable-line react-hooks/exhaustive-deps

  const clean = (ns: FlowNode[]) => ns.map((n) => ({ ...n, selected: false, data: { ...n.data, running: undefined, done: undefined } }));

  const save = useCallback(async (extra?: { status?: string }) => {
    setSaveState("saving");
    const { error } = await supabase.from("workflows").update({
      name, nodes: clean(nodes) as unknown as Json, edges: edges as unknown as Json, updated_at: new Date().toISOString(), ...extra,
    }).eq("id", id);
    if (error) { toast.error(error.message); setSaveState("dirty"); return false; }
    setSaveState("saved"); inv(); return true;
  }, [name, nodes, edges, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // autosave
  useEffect(() => {
    if (!loaded) return undefined;
    setSaveState("dirty");
    const t = setTimeout(() => { if (!running) save(); }, 1500);
    return () => clearTimeout(t);
  }, [nodes.length, edges, name, JSON.stringify(nodes.map((n) => [n.position, n.data.title, n.data.kind, n.data.description, n.data.fields]))]); // eslint-disable-line react-hooks/exhaustive-deps

  const snapshot = () => { past.current.push({ nodes, edges }); if (past.current.length > 60) past.current.shift(); future.current = []; };
  const undo = () => { const p = past.current.pop(); if (!p) return; future.current.push({ nodes, edges }); setNodes(p.nodes); setEdges(p.edges); };
  const redo = () => { const f = future.current.pop(); if (!f) return; past.current.push({ nodes, edges }); setNodes(f.nodes); setEdges(f.edges); };

  const onNodesChange = (c: NodeChange<FlowNode>[]) => {
    if (c.some((x) => x.type === "remove")) snapshot();
    setNodes((ns) => applyNodeChanges(c, ns));
  };
  const onEdgesChange = (c: EdgeChange[]) => { if (c.some((x) => x.type === "remove")) snapshot(); setEdges((es) => applyEdgeChanges(c, es)); };
  const onConnect = (c: Connection) => { snapshot(); setEdges((es) => addEdge({ ...c, type: "smoothstep", id: `e-${c.source}-${c.target}-${Date.now()}` }, es)); };

  function addNode(kind: NodeKind) {
    snapshot();
    const center = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const nid = `n${Date.now().toString(36)}`;
    const n: FlowNode = { id: nid, type: "flow", position: { x: center.x - 100 + Math.random() * 40, y: center.y - 40 }, data: { kind, title: `New ${KIND_META[kind].label.toLowerCase()}` } };
    setNodes((ns) => [...ns, n]);
    if (selected) setEdges((es) => [...es, makeEdge(selected, nid)]);
    setSelected(nid);
  }

  function relayout() {
    snapshot();
    const g = layout(nodes.map((n) => ({ id: n.id, kind: n.data.kind, title: n.data.title, description: n.data.description, fields: n.data.fields })), edges.map((e) => ({ source: e.source, target: e.target, label: e.label as string | undefined })));
    setNodes(g.nodes); setEdges(g.edges);
    setTimeout(() => rf.fitView({ padding: 0.2, duration: 400 }), 30);
  }

  async function runGenerate() {
    setGenBusy(true);
    try {
      const g = await gen({ data: { prompt: genPrompt } });
      snapshot();
      const l = layout(g.nodes, g.edges);
      setNodes(l.nodes); setEdges(l.edges); setGenOpen(false); setGenPrompt("");
      toast.success("Workflow generated");
      setTimeout(() => rf.fitView({ padding: 0.2, duration: 500 }), 50);
    } catch (e) { toast.error((e as Error).message); }
    setGenBusy(false);
  }

  async function debugRun() {
    const trigger = nodes.find((n) => n.data.kind === "trigger") ?? nodes[0];
    if (!trigger) { toast.error("Add a trigger first"); return; }
    setRunning(true); setLog([]); setNodes((ns) => clean(ns));
    const lines: LogLine[] = [];
    const visited = new Set<string>();
    let frontier = [trigger.id];
    let stopped = false;
    while (frontier.length && !stopped) {
      const next: string[] = [];
      for (const nid of frontier) {
        if (visited.has(nid)) continue;
        visited.add(nid);
        const node = nodes.find((n) => n.id === nid);
        if (!node) continue;
        setNodes((ns) => ns.map((n) => n.id === nid ? { ...n, data: { ...n.data, running: true } } : n));
        await new Promise((r) => setTimeout(r, 550));
        setNodes((ns) => ns.map((n) => n.id === nid ? { ...n, data: { ...n.data, running: false, done: true } } : n));
        const st = node.data.kind === "stop" ? "stop" : "ok";
        lines.push({ node: nid, title: node.data.title, status: st, at: new Date().toISOString() });
        setLog([...lines]);
        const outs = edges.filter((e) => e.source === nid);
        const happy = outs.filter((e) => String(e.label ?? "").toLowerCase() !== "else");
        next.push(...(happy.length ? happy : outs).map((e) => e.target));
      }
      frontier = next;
      if (visited.size > 200) stopped = true;
    }
    const { error } = await supabase.from("workflow_runs").insert({ workflow_id: id, status: lines.some((l) => l.status === "stop") ? "stopped" : "success", log: lines as unknown as Json });
    if (error) toast.error(error.message); else toast.success(`Run complete · ${lines.length} steps`);
    inv(); setRunning(false);
  }

  const sel = nodes.find((n) => n.id === selected);
  const updateSel = (patch: Partial<FlowNode["data"]>) => setNodes((ns) => ns.map((n) => n.id === selected ? { ...n, data: { ...n.data, ...patch } } : n));
  const outgoing = useMemo(() => edges.filter((e) => e.source === selected), [edges, selected]);
  const styledEdges = useMemo(() => edges.map((e) => {
    const hot = selected && (e.source === selected || e.target === selected);
    return { ...e, type: "smoothstep", style: { stroke: hot ? "var(--node-validate)" : "var(--muted-foreground)", strokeWidth: hot ? 1.8 : 1.1, opacity: hot ? 1 : 0.55 } };
  }), [edges, selected]);

  if (!loaded) return <div className="grid h-full place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  return (
    <div className="flex h-full flex-col gap-3 bg-canvas p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card px-3 py-2 shadow-soft">
        <Link to="/app/workflows" aria-label="Back" className="rounded-lg p-1.5 hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <input value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 rounded-md bg-transparent px-1 font-semibold outline-none focus:bg-muted sm:max-w-xs" />
        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status === "published" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{status}</span>
        <span className="ml-auto hidden items-center gap-1.5 text-sm text-success sm:flex">
          {saveState === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          {saveState === "saved" ? "Saved just now" : saveState === "saving" ? "Saving…" : "Unsaved changes"}
        </span>
        <button onClick={async () => { if (await save({ status: "draft" })) { setStatus("draft"); toast.success("Draft saved"); } }} className="rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-muted">Save Draft</button>
        <button onClick={async () => { if (await save({ status: "published" })) { setStatus("published"); toast.success("Workflow published"); } }} className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Publish</button>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <div className={`relative min-w-0 flex-1 overflow-hidden rounded-2xl border bg-canvas ${running ? "run-active" : ""}`}>
          <ReactFlow
            nodes={nodes} edges={styledEdges} nodeTypes={nodeTypes}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
            onNodeClick={(_, n) => setSelected(n.id)} onPaneClick={() => setSelected(null)}
            onNodeDragStart={snapshot} onMove={(_, v) => setZoom(v.zoom)}
            panOnDrag={pan} selectionOnDrag={!pan} minZoom={0.2} maxZoom={2} defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="var(--border)" />
          </ReactFlow>
          <div className="absolute left-3 top-3 flex gap-1 rounded-xl border bg-card p-1 shadow-soft">
            <IconBtn label="Undo" onClick={undo}><Undo2 className="size-4" /></IconBtn>
            <IconBtn label="Redo" onClick={redo}><Redo2 className="size-4" /></IconBtn>
          </div>
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-xl border bg-card p-1 shadow-soft">
            <IconBtn label="Zoom out" onClick={() => rf.zoomOut()}><Minus className="size-4" /></IconBtn>
            <span className="w-10 text-center text-xs font-medium">{Math.round(zoom * 100)}%</span>
            <IconBtn label="Zoom in" onClick={() => rf.zoomIn()}><Plus className="size-4" /></IconBtn>
          </div>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-2xl border bg-card p-1.5 shadow-soft">
            <button onClick={() => setPan(!pan)} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ${pan ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {pan ? <Hand className="size-4" /> : <MousePointer2 className="size-4" />}<span className="hidden sm:inline">{pan ? "Move" : "Select"}</span>
            </button>
            <AddMenu onAdd={addNode} />
            <IconBtn label="Auto layout" onClick={relayout}><LayoutGrid className="size-4" /></IconBtn>
            <IconBtn label="Generate with AI" onClick={() => setGenOpen(true)}><Wand2 className="size-4" /></IconBtn>
            <IconBtn label="Ask copilot" onClick={() => ai.open()}><Bot className="size-4" /></IconBtn>
            <span className="mx-1 h-6 w-px bg-border" />
            <div className="flex rounded-xl bg-muted p-0.5 text-sm">
              {(["builder", "debug"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`rounded-lg px-3 py-1.5 font-medium capitalize ${mode === m ? "bg-card shadow-soft" : "text-muted-foreground"}`}>{m}</button>
              ))}
            </div>
          </div>

          {genOpen && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-foreground/20 p-4">
              <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-glow">
                <div className="flex items-center gap-2"><Sparkles className="size-5 text-primary" /><h3 className="flex-1 font-semibold">Generate with AI</h3><IconBtn label="Close" onClick={() => setGenOpen(false)}><X className="size-4" /></IconBtn></div>
                <p className="mt-1 text-sm text-muted-foreground">Describe the process. This replaces the current canvas (you can undo).</p>
                <textarea value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)} rows={4} placeholder="e.g. When an invoice arrives, extract totals with AI, validate the vendor, and send for approval over $5,000"
                  className="mt-3 w-full rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                <button disabled={genBusy || genPrompt.length < 3} onClick={runGenerate} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-60">
                  {genBusy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />} Generate
                </button>
              </div>
            </div>
          )}
        </div>

        {(sel || mode === "debug") && (
          <aside className="fixed inset-x-3 bottom-3 top-28 z-20 flex w-auto flex-col overflow-y-auto rounded-2xl border bg-card p-4 shadow-glow md:static md:w-80 md:shrink-0 md:shadow-soft">
            {mode === "debug" ? (
              <DebugPanel log={log} running={running} onRun={debugRun} onClose={() => setMode("builder")} />
            ) : sel && (
              <Inspector node={sel} outgoing={outgoing} nodes={nodes} onClose={() => setSelected(null)} onChange={updateSel}
                onDelete={() => { snapshot(); setNodes((ns) => ns.filter((n) => n.id !== sel.id)); setEdges((es) => es.filter((e) => e.source !== sel.id && e.target !== sel.id)); setSelected(null); }}
                onEdgeLabel={(eid, label) => setEdges((es) => es.map((e) => e.id === eid ? { ...e, label } : e))}
                onAddStep={() => addNode("action")} />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button aria-label={label} title={label} onClick={onClick} className="grid size-8 place-items-center rounded-lg hover:bg-muted">{children}</button>;
}

function AddMenu({ onAdd }: { onAdd: (k: NodeKind) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <IconBtn label="Add node" onClick={() => setOpen(!open)}><Plus className="size-4" /></IconBtn>
      {open && (
        <div className="absolute bottom-11 left-1/2 w-48 -translate-x-1/2 rounded-xl border bg-popover p-1 shadow-glow">
          {NODE_KINDS.map((k) => { const I = KIND_ICON[k]; return (
            <button key={k} onClick={() => { onAdd(k); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent">
              <span className="grid size-5 place-items-center rounded-md text-primary-foreground" style={{ background: KIND_META[k].color }}><I className="size-3" /></span>{KIND_META[k].label}
            </button>); })}
        </div>
      )}
    </div>
  );
}

function Inspector({ node, outgoing, nodes, onClose, onChange, onDelete, onEdgeLabel, onAddStep }: {
  node: FlowNode; outgoing: Edge[]; nodes: FlowNode[]; onClose: () => void; onChange: (p: Partial<FlowNode["data"]>) => void; onDelete: () => void;
  onEdgeLabel: (id: string, l: string) => void; onAddStep: () => void;
}) {
  const meta = KIND_META[node.data.kind];
  const Icon = KIND_ICON[node.data.kind];
  const [field, setField] = useState("");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg text-primary-foreground" style={{ background: meta.color }}><Icon className="size-4" /></span>
        <h3 className="flex-1 font-semibold">{meta.label}</h3>
        <IconBtn label="Close" onClick={onClose}><X className="size-4" /></IconBtn>
      </div>
      <input value={node.data.title} onChange={(e) => onChange({ title: e.target.value })} className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
      <label className="block text-xs font-semibold text-muted-foreground">Type
        <select value={node.data.kind} onChange={(e) => onChange({ kind: e.target.value as NodeKind })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground">
          {NODE_KINDS.map((k) => <option key={k} value={k}>{KIND_META[k].label}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold text-muted-foreground">Description
        <textarea value={node.data.description ?? ""} onChange={(e) => onChange({ description: e.target.value })} rows={2} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm font-normal text-foreground" />
      </label>
      <div>
        <p className="text-sm font-semibold">Next Step</p>
        <p className="text-xs text-muted-foreground">Branches leaving this step — label them (e.g. "if valid", "else").</p>
        <div className="mt-2 space-y-2 rounded-xl border bg-muted/40 p-2">
          {outgoing.length === 0 && <p className="p-1 text-xs text-muted-foreground">No connections. Drag from the right dot of a node.</p>}
          {outgoing.map((e) => (
            <div key={e.id} className="rounded-lg border bg-card p-2">
              <input value={(e.label as string) ?? ""} placeholder="condition label" onChange={(ev) => onEdgeLabel(e.id, ev.target.value)} className="w-full rounded-md bg-muted px-2 py-1 text-xs outline-none" />
              <p className="mt-1 truncate text-xs">→ {nodes.find((n) => n.id === e.target)?.data.title}</p>
            </div>
          ))}
        </div>
        <button onClick={onAddStep} className="mt-2 flex w-full items-center justify-center gap-1 rounded-full border py-2 text-sm font-medium text-primary hover:bg-accent">Add Step <Plus className="size-4" /></button>
      </div>
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold">Validation Rules <span className="rounded bg-destructive/10 px-1.5 text-[10px] font-bold uppercase text-destructive">required</span></p>
        <p className="text-xs text-muted-foreground">Each execution must include:</p>
        <div className="mt-2 space-y-1.5">
          {(node.data.fields ?? []).map((f) => (
            <div key={f} className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm">
              <Check className="size-3.5 text-success" /><span className="flex-1 truncate">{f}</span>
              <button aria-label={`Remove ${f}`} onClick={() => onChange({ fields: node.data.fields?.filter((x) => x !== f) })}><X className="size-3.5 text-muted-foreground" /></button>
            </div>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); if (field.trim()) { onChange({ fields: [...(node.data.fields ?? []), field.trim()] }); setField(""); } }} className="flex gap-1.5">
            <input value={field} onChange={(e) => setField(e.target.value)} placeholder="employee.email" className="min-w-0 flex-1 rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none" />
            <button className="rounded-lg bg-primary px-2.5 text-primary-foreground" aria-label="Add field"><Plus className="size-4" /></button>
          </form>
        </div>
      </div>
      <button onClick={onDelete} className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-2 text-sm font-medium text-destructive hover:bg-destructive/5"><Trash2 className="size-4" />Delete step</button>
    </div>
  );
}

function DebugPanel({ log, running, onRun, onClose }: { log: LogLine[]; running: boolean; onRun: () => void; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Play className="size-5 text-primary" /><h3 className="flex-1 font-semibold">Debug run</h3><IconBtn label="Close" onClick={onClose}><X className="size-4" /></IconBtn></div>
      <p className="text-sm text-muted-foreground">Simulates an execution from the trigger, following the happy path (non-"else" branches), and saves it to your run history.</p>
      <button disabled={running} onClick={onRun} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-60">
        {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}{running ? "Running…" : "Run test"}
      </button>
      <ol className="space-y-1.5">
        {log.map((l, i) => (
          <li key={i} className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm">
            <span className={`grid size-5 place-items-center rounded-full text-[10px] font-bold text-primary-foreground ${l.status === "stop" ? "bg-destructive" : "bg-success"}`}>{i + 1}</span>
            <span className="flex-1 truncate">{l.title}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
