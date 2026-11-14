import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Bot, CheckCircle2, CircleStop, Fingerprint, MoreVertical, ScanSearch, ShieldCheck, Sparkles, Zap, Loader2, Flag } from "lucide-react";
import { KIND_META, type FlowNode, type NodeKind } from "@/lib/flow";

export const KIND_ICON: Record<NodeKind, typeof Zap> = {
  trigger: Zap, validate: ShieldCheck, action: ScanSearch, identify: Fingerprint, ai_process: Bot, ai_task: Sparkles, stop: CircleStop, end: Flag,
};

export function FlowNodeCard({ data, selected }: NodeProps<FlowNode>) {
  const meta = KIND_META[data.kind] ?? KIND_META.action;
  const Icon = KIND_ICON[data.kind] ?? Zap;
  const ring = data.running ? "ring-4 ring-primary/30 border-primary" : selected ? "border-[color:var(--node-validate)] ring-4 ring-[color:var(--node-validate)]/15" : "";
  if (meta.pill) {
    return (
      <div className={`flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium shadow-soft transition ${ring}`}>
        <Handle type="target" position={Position.Left} />
        <span className="grid size-5 place-items-center rounded-full text-primary-foreground" style={{ background: meta.color }}><Icon className="size-3" /></span>
        <span className="max-w-[180px] truncate">{data.title}</span>
        {data.done && <CheckCircle2 className="size-3.5 text-success" />}
        <Handle type="source" position={Position.Right} />
      </div>
    );
  }
  return (
    <div className={`w-[200px] rounded-2xl border bg-card p-1.5 shadow-soft transition ${ring}`}>
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-1.5 rounded-xl px-2 py-1.5" style={{ background: `color-mix(in oklab, ${meta.color} 10%, transparent)` }}>
        <span className="grid size-5 place-items-center rounded-md text-primary-foreground" style={{ background: meta.color }}><Icon className="size-3" /></span>
        <span className="flex-1 text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
        {data.running ? <Loader2 className="size-3.5 animate-spin text-primary" /> : data.done ? <CheckCircle2 className="size-3.5 text-success" /> : <MoreVertical className="size-3.5 text-muted-foreground" />}
      </div>
      <p className="px-2 pb-1.5 pt-2 text-[13px] leading-snug">{data.title}</p>
      {data.fields && data.fields.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 pb-1.5">{data.fields.map((f) => <span key={f} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{f}</span>)}</div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
