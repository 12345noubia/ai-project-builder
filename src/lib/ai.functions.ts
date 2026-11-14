import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { askModel, extractJson, GRAPH_SPEC } from "./ai.server";
import type { SimpleEdge, SimpleNode } from "./flow";

const msg = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) });

export const chatAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ messages: z.array(msg).min(1).max(40), context: z.string().max(20000).optional() }).parse(d))
  .handler(async ({ data }) => {
    const text = await askModel(
      `You are Opero Copilot, a friendly expert in workflow automation inside the Opero builder. Give concise, practical answers in markdown. Suggest concrete nodes, validation rules and branches.${data.context ? `\nCurrent workflow (JSON):\n${data.context}` : ""}`,
      data.messages,
    );
    return { text };
  });

export const generateWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ prompt: z.string().min(3).max(2000) }).parse(d))
  .handler(async ({ data }) => {
    const text = await askModel(`You design automation workflows. ${GRAPH_SPEC}`, [{ role: "user", content: data.prompt }]);
    return extractJson<{ nodes: SimpleNode[]; edges: SimpleEdge[] }>(text);
  });
