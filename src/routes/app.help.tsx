import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/help")({ component: Help });
const faq = [
  ["How do I connect steps?", "Drag from the dot on the right of a step to the left dot of another."],
  ["How do I test a workflow?", "Switch to Debug in the bottom toolbar and press Run test."],
  ["What does GitHub Import do?", "It reads a public repo and creates one workflow per page or feature."],
  ["Can AI build a workflow for me?", "Yes — use the wand button in the editor and describe your process."],
];
function Help() {
  return <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-8"><h1 className="text-3xl font-bold">Help Centre</h1>
    {faq.map(([q, a]) => <div key={q} className="rounded-2xl border bg-card p-5"><p className="font-semibold">{q}</p><p className="mt-1 text-sm text-muted-foreground">{a}</p></div>)}</div>;
}
