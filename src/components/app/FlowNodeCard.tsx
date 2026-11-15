import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Bot, CheckCircle2, CircleStop, Fingerprint, MoreVertical, ScanSearch, ShieldCheck, Sparkles, Zap, Loader2, Flag, UserRound, Ellipsis, SquareDashed, Database, KeyRound, Link2, AlertTriangle } from "lucide-react";
import { KIND_META, type FlowNode, type NodeKind } from "@/lib/flow";

export const KIND_ICON: Record<NodeKind, typeof Zap> = {
  trigger: Zap, validate: ShieldCheck, action: ScanSearch, identify: Fingerprint, ai_process: Bot, ai_task: Sparkles, stop: CircleStop, end: Flag,
  actor: UserRound, usecase: Ellipsis, system: SquareDashed, table: Database,
};

/** Figma-style virtual user cursor + comment bubble shown while a debug run visits this node. */
function VirtualUser({ data }: { data: FlowNode["data"] }) {
  if (!data.running || !data.persona) return null;
  return (
    <div className="pointer-events-none absolute -top-3 left-1/2 z-50 -translate-y-full animate-fade-up">
      <div className="flex items-end gap-1.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-card bg-primary text-xs font-bold text-primary-foreground shadow-glow animate-pulse">
          {data.persona.slice(0, 2).toUpperCase()}
        </span>
        <div className={`w-56 rounded-2xl rounded-bl-sm border px-3 py-2 text-[11px] leading-snug shadow-glow ${data.failed ? "border-destructive bg-destructive text-destructive-foreground" : "bg-popover text-popover-foreground"}`}>
          <p className="mb-0.5 font-semibold">{data.persona}</p>
          {data.bubble}
        </div>
      </div>
    </div>
  );
}

function Status({ data }: { data: FlowNode["data"] }) {
  if (data.running) return <Loader2 className="size-3.5 animate-spin text-primary" />;
  if (data.failed) return <AlertTriangle className="size-3.5 text-destructive" />;
  if (data.done) return <CheckCircle2 className="size-3.5 text-success" />;
  return <MoreVertical className="size-3.5 text-muted-foreground" />;
}

export function FlowNodeCard({ data, selected }: NodeProps<FlowNode>) {
  const meta = KIND_META[data.kind] ?? KIND_META.action;
  const Icon = KIND_ICON[data.kind] ?? Zap;
  const ring = data.failed ? "ring-4 ring-destructive/30 border-destructive" : data.running ? "ring-4 ring-primary/30 border-primary" : selected ? "border-[color:var(--node-validate)] ring-4 ring-[color:var(--node-validate)]/15" : "";
  const handles = (<><Handle type="target" position={Position.Left} /><Handle type="source" position={Position.Right} /></>);

  if (data.kind === "actor") {
    return (
      <div className={`relative flex w-28 flex-col items-center gap-1 rounded-2xl border bg-card p-2 shadow-soft ${ring}`}>
        <VirtualUser data={data} />{handles}
        <span className="grid size-12 place-items-center rounded-full text-primary-foreground" style={{ background: meta.color }}><UserRound className="size-6" /></span>
        <span className="text-center text-xs font-semibold">{data.title}</span>
      </div>
    );
  }
  if (data.kind === "usecase") {
    return (
      <div className={`relative grid min-h-16 w-52 place-items-center rounded-[50%] border-2 bg-card px-6 py-3 text-center text-xs font-medium shadow-soft ${ring}`} style={{ borderColor: meta.color }}>
        <VirtualUser data={data} />{handles}
        <span>{data.title}</span>
      </div>
    );
  }
  if (data.kind === "system") {
    return (
      <div className={`relative w-60 rounded-2xl border-2 border-dashed bg-muted/30 p-3 text-sm shadow-soft ${ring}`}>
        <VirtualUser data={data} />{handles}
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><SquareDashed className="size-3.5" />System</p>
        <p className="mt-1 font-semibold">{data.title}</p>
        {data.description && <p className="mt-1 text-xs text-muted-foreground">{data.description}</p>}
      </div>
    );
  }
  if (data.kind === "table") {
    return (
      <div className={`relative w-60 overflow-hidden rounded-xl border bg-card shadow-soft ${ring}`}>
        <VirtualUser data={data} />{handles}
        <div className="flex items-center gap-1.5 px-3 py-2 text-primary-foreground" style={{ background: meta.color }}>
          <Database className="size-3.5" /><span className="flex-1 truncate font-mono text-xs font-bold">{data.title}</span><Status data={data} />
        </div>
        <ul className="divide-y text-[11px]">
          {(data.fields ?? []).map((f) => {
            const [col, ...rest] = f.split(" ");
            const pk = /\bPK\b/i.test(f); const fk = /\bFK\b|->/i.test(f);
            return (
              <li key={f} className="flex items-center gap-1.5 px-3 py-1">
                {pk ? <KeyRound className="size-3 text-node-validate" /> : fk ? <Link2 className="size-3 text-node-trigger" /> : <span className="size-3" />}
                <span className="font-mono font-medium">{col}</span>
                <span className="ml-auto truncate font-mono text-muted-foreground">{rest.join(" ")}</span>
              </li>
            );
          })}
          {!data.fields?.length && <li className="px-3 py-1.5 text-muted-foreground">No columns yet</li>}
        </ul>
      </div>
    );
  }
  if (meta.pill) {
    return (
      <div className={`relative flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium shadow-soft transition ${ring}`}>
        <VirtualUser data={data} />
        <Handle type="target" position={Position.Left} />
        <span className="grid size-5 place-items-center rounded-full text-primary-foreground" style={{ background: meta.color }}><Icon className="size-3" /></span>
        <span className="max-w-[180px] truncate">{data.title}</span>
        {data.done && !data.failed && <CheckCircle2 className="size-3.5 text-success" />}
        {data.failed && <AlertTriangle className="size-3.5 text-destructive" />}
        <Handle type="source" position={Position.Right} />
      </div>
    );
  }
  return (
    <div className={`relative w-[200px] rounded-2xl border bg-card p-1.5 shadow-soft transition ${ring}`}>
      <VirtualUser data={data} />
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-1.5 rounded-xl px-2 py-1.5" style={{ background: `color-mix(in oklab, ${meta.color} 10%, transparent)` }}>
        <span className="grid size-5 place-items-center rounded-md text-primary-foreground" style={{ background: meta.color }}><Icon className="size-3" /></span>
        <span className="flex-1 text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
        <Status data={data} />
      </div>
      <p className="px-2 pb-1.5 pt-2 text-[13px] leading-snug">{data.title}</p>
      {data.fields && data.fields.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 pb-1.5">{data.fields.map((f) => <span key={f} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{f}</span>)}</div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
