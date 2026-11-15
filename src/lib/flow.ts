import type { Edge, Node } from "@xyflow/react";

export type NodeKind = "trigger" | "validate" | "action" | "identify" | "ai_process" | "ai_task" | "stop" | "end" | "actor" | "usecase" | "system" | "table";

export interface FlowNodeData extends Record<string, unknown> {
  kind: NodeKind;
  title: string;
  description?: string | undefined;
  fields?: string[] | undefined;
  running?: boolean | undefined;
  done?: boolean | undefined;
  failed?: boolean | undefined;
  persona?: string | undefined;
  bubble?: string | undefined;
}

export type FlowNode = Node<FlowNodeData, "flow">;

export const KIND_META: Record<NodeKind, { label: string; color: string; pill?: boolean; group?: DiagramType }> = {
  trigger: { label: "Trigger", color: "var(--node-trigger)" },
  validate: { label: "Validate", color: "var(--node-validate)" },
  action: { label: "Action", color: "var(--node-action)" },
  identify: { label: "Identify", color: "var(--node-identify)" },
  ai_process: { label: "AI Process", color: "var(--node-ai)" },
  ai_task: { label: "AI Task", color: "var(--node-task)" },
  stop: { label: "Stop", color: "var(--node-stop)", pill: true },
  end: { label: "Outcome", color: "var(--node-end)", pill: true },
  actor: { label: "Actor", color: "var(--node-trigger)", group: "usecase" },
  usecase: { label: "Use case", color: "var(--node-ai)", group: "usecase" },
  system: { label: "System boundary", color: "var(--node-action)", group: "usecase" },
  table: { label: "DB table", color: "var(--node-end)", group: "erd" },
};

export type DiagramType = "workflow" | "usecase" | "erd";
export const DIAGRAM_LABEL: Record<DiagramType, string> = { workflow: "Workflow", usecase: "Use case diagram", erd: "Database ERD" };
export function kindsFor(t: DiagramType): NodeKind[] {
  return NODE_KINDS.filter((k) => (KIND_META[k].group ?? "workflow") === t);
}
export function detectDiagram(kinds: NodeKind[]): DiagramType {
  if (kinds.some((k) => k === "table")) return "erd";
  if (kinds.some((k) => k === "actor" || k === "usecase")) return "usecase";
  return "workflow";
}

export const NODE_KINDS = Object.keys(KIND_META) as NodeKind[];

export interface SimpleNode { id: string; kind: NodeKind; title: string; description?: string | undefined; fields?: string[] | undefined }
export interface SimpleEdge { source: string; target: string; label?: string | undefined }

/** Layered left-to-right layout by longest path from roots. */
export function layout(nodes: SimpleNode[], edges: SimpleEdge[]): { nodes: FlowNode[]; edges: Edge[] } {
  const ids = new Set(nodes.map((n) => n.id));
  const valid = edges.filter((e) => ids.has(e.source) && ids.has(e.target) && e.source !== e.target);
  const rank = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (let i = 0; i < nodes.length; i++) {
    let changed = false;
    for (const e of valid) {
      const r = (rank.get(e.source) ?? 0) + 1;
      if (r > (rank.get(e.target) ?? 0) && r < nodes.length) { rank.set(e.target, r); changed = true; }
    }
    if (!changed) break;
  }
  const cols = new Map<number, number>();
  const out: FlowNode[] = nodes.map((n) => {
    const r = rank.get(n.id) ?? 0;
    const row = cols.get(r) ?? 0;
    cols.set(r, row + 1);
    return {
      id: n.id, type: "flow", position: { x: r * 290, y: row * 150 },
      data: { kind: NODE_KINDS.includes(n.kind) ? n.kind : "action", title: n.title, description: n.description, fields: n.fields },
    };
  });
  return { nodes: out, edges: valid.map((e, i) => makeEdge(e.source, e.target, e.label, `e${i}-${e.source}-${e.target}`)) };
}

export function makeEdge(source: string, target: string, label?: string, id?: string): Edge {
  return { id: id ?? `e-${source}-${target}-${Math.random().toString(36).slice(2, 7)}`, source, target, label, type: "smoothstep" };
}

export const SAMPLE: { nodes: SimpleNode[]; edges: SimpleEdge[] } = {
  nodes: [
    { id: "t", kind: "trigger", title: "New employee record created" },
    { id: "v", kind: "validate", title: "Validate employee data", fields: ["name", "email", "type", "date"] },
    { id: "s", kind: "stop", title: "Stop and notify HR" },
    { id: "a1", kind: "action", title: "Full-time" },
    { id: "a2", kind: "action", title: "Contractor" },
    { id: "a3", kind: "action", title: "Internship" },
    { id: "i", kind: "identify", title: "Match existing employee" },
    { id: "c", kind: "end", title: "Create new record" },
    { id: "u", kind: "end", title: "Update existing record" },
    { id: "ai", kind: "ai_process", title: "Extract role & department" },
    { id: "k1", kind: "ai_task", title: "Normalize job title" },
    { id: "k2", kind: "ai_task", title: "Detect department" },
  ],
  edges: [
    { source: "t", target: "v" }, { source: "v", target: "s", label: "else" },
    { source: "v", target: "a1", label: "if valid" }, { source: "v", target: "a2" }, { source: "v", target: "a3" },
    { source: "a1", target: "i" }, { source: "a2", target: "i" }, { source: "a3", target: "i" },
    { source: "i", target: "c", label: "else" }, { source: "i", target: "u", label: "if match found" },
    { source: "t", target: "ai" }, { source: "ai", target: "k1" }, { source: "ai", target: "k2" },
  ],
};
