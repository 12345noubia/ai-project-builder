import { generateResponse, GatewayError } from "@lovable.dev/ai-gateway";

export async function askModel(instructions: string, input: { role: "user" | "assistant"; content: string }[]): Promise<string> {
  try {
    const res = await generateResponse({
      model: "openai/gpt-6-astra",
      instructions,
      input: input.map((m) => ({ role: m.role, content: m.content })),
    });
    const anyRes = res as unknown as { output_text?: string; output?: { type: string; content?: { type: string; text?: string }[] }[] };
    if (anyRes.output_text) return anyRes.output_text;
    return (anyRes.output ?? [])
      .flatMap((o) => (o.type === "message" ? o.content ?? [] : []))
      .map((c) => (c.type === "output_text" ? c.text ?? "" : ""))
      .join("");
  } catch (e) {
    if (e instanceof GatewayError) {
      if (e.code === "payment_required" || e.httpStatus === 402) throw new Error("AI credits are used up. Please top up to keep using the AI helper.");
      if (e.httpStatus === 429) throw new Error("The AI helper is busy right now. Try again in a moment.");
      throw new Error("The AI helper couldn't answer. Please try again.");
    }
    throw e;
  }
}

export function extractJson<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("AI returned an unexpected answer. Please try again.");
  return JSON.parse(text.slice(start, end + 1)) as T;
}

export const GRAPH_SPEC = `Node kinds: trigger (start event), validate (check data), action (do something), identify (lookup/match), ai_process (AI step), ai_task (small AI subtask), stop (halt + notify), end (final outcome).
Return JSON only: {"nodes":[{"id":"n1","kind":"trigger","title":"short title","description":"optional","fields":["optional","field","chips"]}],"edges":[{"source":"n1","target":"n2","label":"optional e.g. if valid / else"}]}.
Exactly one trigger as the first node. 5-14 nodes. Titles under 40 characters.`;

export const USECASE_SPEC = `Use case diagram. Node kinds: actor (a person or external system), system (the system boundary, exactly one), usecase (an action the actor performs, short verb phrase).
Edges: actor -> usecase (label optional), usecase -> usecase with label "<<include>>" or "<<extend>>".
Return JSON only: {"nodes":[{"id":"a1","kind":"actor","title":"Customer"}],"edges":[{"source":"a1","target":"u1"}]}. 6-16 nodes. Titles under 40 characters.`;

export const ERD_SPEC = `Database ERD. Every node has kind "table", title = table name, fields = column list, each formatted "column type [PK] [FK -> other_table.column]" e.g. "id uuid PK", "user_id uuid FK -> users.id".
Edges go from the table holding the foreign key to the referenced table, label like "many-to-one".
Return JSON only: {"nodes":[{"id":"t1","kind":"table","title":"users","fields":["id uuid PK","email text"]}],"edges":[{"source":"t2","target":"t1","label":"many-to-one"}]}. 2-14 tables.`;

export function specFor(t: "workflow" | "usecase" | "erd") {
  return t === "usecase" ? USECASE_SPEC : t === "erd" ? ERD_SPEC : GRAPH_SPEC;
}
