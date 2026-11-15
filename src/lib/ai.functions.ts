import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { askModel, extractJson, specFor } from "./ai.server";
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
  .inputValidator((d) => z.object({ prompt: z.string().min(3).max(4000), type: z.enum(["workflow", "usecase", "erd"]).default("workflow") }).parse(d))
  .handler(async ({ data }) => {
    const text = await askModel(`You are a senior software architect producing diagrams. ${specFor(data.type)}`, [{ role: "user", content: data.prompt }]);
    return extractJson<{ nodes: SimpleNode[]; edges: SimpleEdge[] }>(text);
  });

const step = z.object({ title: z.string(), kind: z.string(), status: z.string(), note: z.string().optional() });

export const diagnoseRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workflow: z.string().max(20000), steps: z.array(step).max(200), persona: z.string().max(80), lang: z.enum(["en", "fr"]) }).parse(d))
  .handler(async ({ data }) => {
    const text = await askModel(
      `You are a QA engineer reviewing a simulated test run of a software workflow, performed by a virtual user persona. Write in ${data.lang === "fr" ? "French" : "English"}.
Return JSON only: {"summary":"2-3 sentence executive summary","rootCause":"most likely root cause of failures or main risk, 1-3 sentences","recommendations":["3-6 concrete fixes"],"patch":"a short illustrative code fix (TypeScript) for the main issue, or empty string","steps":[{"title":"exact step title","explanation":"1-2 sentence explanation of what happened at this step"}]}`,
      [{ role: "user", content: `Persona: ${data.persona}\nWorkflow: ${data.workflow}\nRun steps: ${JSON.stringify(data.steps)}` }],
    );
    return extractJson<{ summary: string; rootCause: string; recommendations: string[]; patch: string; steps: { title: string; explanation: string }[] }>(text);
  });
