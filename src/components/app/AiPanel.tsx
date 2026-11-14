import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, Send, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { chatAssistant } from "@/lib/ai.functions";

type Msg = { role: "user" | "assistant"; content: string };
const Ctx = createContext<{ open: (prompt?: string) => void; setContext: (c: string | undefined) => void }>({ open: () => {}, setContext: () => {} });
export const useAi = () => useContext(Ctx);

export function AiProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const ctxRef = useRef<string | undefined>(undefined);
  const chat = useServerFn(chatAssistant);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const r = await chat({ data: { messages: next, context: ctxRef.current } });
      setMsgs([...next, { role: "assistant", content: r.text }]);
    } catch (e) {
      setMsgs([...next, { role: "assistant", content: `**Sorry:** ${(e as Error).message}` }]);
    }
    setBusy(false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return (
    <Ctx.Provider value={{ open: (p) => { setOpen(true); if (p) send(p); }, setContext: (c) => { ctxRef.current = c; } }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <motion.aside initial={{ x: 420, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 420, opacity: 0 }} transition={{ type: "spring", damping: 26 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-card shadow-glow">
            <div className="flex items-center gap-3 border-b p-4">
              <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Bot className="size-5" /></span>
              <div className="flex-1"><p className="font-semibold">Opero Copilot</p><p className="text-xs text-muted-foreground">Knows the workflow you're viewing</p></div>
              <button aria-label="Close" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-muted"><X className="size-4" /></button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {msgs.length === 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Try asking:</p>
                  {["Review this workflow and suggest improvements", "What validation rules should I add?", "Explain this workflow in plain words"].map((s) => (
                    <button key={s} onClick={() => send(s)} className="block w-full rounded-xl border p-3 text-left text-sm hover:bg-accent">{s}</button>
                  ))}
                </div>
              )}
              {msgs.map((m, i) => m.role === "user"
                ? <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">{m.content}</div>
                : <div key={i} className="prose prose-sm max-w-none text-sm text-foreground [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5"><ReactMarkdown>{m.content}</ReactMarkdown></div>)}
              {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Thinking…</div>}
              <div ref={endRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t p-3">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={2} placeholder="Ask the copilot…"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                className="flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <button aria-label="Send" disabled={busy} className="grid size-11 shrink-0 place-items-center self-end rounded-xl bg-primary text-primary-foreground disabled:opacity-60"><Send className="size-4" /></button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
