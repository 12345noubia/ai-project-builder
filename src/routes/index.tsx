import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Bug, GitBranch, Github, Layers, ShieldCheck, Workflow, Zap } from "lucide-react";
import hero from "@/assets/hero-flow.jpg";
import { Logo } from "@/components/app/Logo";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Opero — Build AI-powered workflows visually" },
      { name: "description", content: "Opero is a visual automation engine with an AI copilot, debugging, and one-click GitHub repo mapping." },
      { property: "og:title", content: "Opero — Build AI-powered workflows visually" },
      { property: "og:description", content: "Visual automation engine with an AI copilot and GitHub repo mapping." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Workflow, title: "Visual builder", text: "Drag, connect and branch triggers, validations, actions and AI steps on an infinite canvas." },
  { icon: Bot, title: "Real AI copilot", text: "Ask questions about your flow or describe one in plain words and watch it get built." },
  { icon: Github, title: "GitHub mapping", text: "Paste a repo link — Opero reads it and lays out its pages and features as workflows." },
  { icon: Bug, title: "Debug runs", text: "Step through executions node by node and keep a log of every run." },
  { icon: ShieldCheck, title: "Validation rules", text: "Define required fields and conditional branches so bad data never slips through." },
  { icon: Layers, title: "Projects & teams", text: "Group workflows into projects like HR, Payroll, Sales Ops and Billing." },
];

const fade = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

function Landing() {
  const { user } = useAuth();
  const cta = user ? "/app" : "/auth";
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <div className="bg-hero">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Logo />
          <nav className="flex items-center gap-2">
            <a href="#features" className="hidden rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:block">Features</a>
            <Link to={cta} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90">
              {user ? "Open app" : "Sign in"}
            </Link>
          </nav>
        </header>

        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-10 lg:grid-cols-2 lg:pt-16">
          <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.12 }}>
            <motion.span variants={fade} className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-accent-foreground shadow-soft">
              <Zap className="size-3.5 text-warning" /> AI workflow engine
            </motion.span>
            <motion.h1 variants={fade} className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Automate the work <span className="text-primary">between</span> your work.
            </motion.h1>
            <motion.p variants={fade} className="mt-5 max-w-lg text-lg text-muted-foreground">
              Opero turns processes — and even whole GitHub projects — into clear, runnable workflows. Build visually, ask the AI copilot, debug in one click.
            </motion.p>
            <motion.div variants={fade} className="mt-8 flex flex-wrap gap-3">
              <Link to={cta} className="group inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-glow">
                Start building free <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </Link>
              <a href="#features" className="inline-flex items-center gap-2 rounded-xl border bg-card px-5 py-3 font-semibold shadow-soft">
                <GitBranch className="size-4" /> See how it works
              </a>
            </motion.div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.92, rotate: -2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 0.9, ease: "easeOut" }} className="relative">
            <img src={hero} width={1536} height={1024} alt="Connected workflow cards" className="animate-float w-full rounded-3xl border bg-card shadow-glow" />
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}
              className="absolute -bottom-5 left-4 flex items-center gap-2 rounded-2xl border bg-card px-4 py-3 shadow-soft">
              <span className="grid size-8 place-items-center rounded-lg bg-success/15 text-success"><ShieldCheck className="size-4" /></span>
              <div><p className="text-xs text-muted-foreground">Last run</p><p className="text-sm font-semibold">12 steps · passed</p></div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 }}
              className="absolute -top-4 right-4 flex items-center gap-2 rounded-2xl border bg-card px-4 py-3 shadow-soft">
              <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary"><Bot className="size-4" /></span>
              <p className="text-sm font-semibold">Copilot suggested 3 steps</p>
            </motion.div>
          </motion.div>
        </section>
      </div>

      <section id="features" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">Everything your workflows need</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">From the first trigger to the final record — designed for clarity.</p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              whileHover={{ y: -6 }} className="rounded-2xl border bg-card p-6 shadow-soft">
              <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary"><f.icon className="size-5" /></span>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground shadow-glow">
          <h2 className="text-3xl font-bold sm:text-4xl">Map your first repo in 30 seconds</h2>
          <p className="mx-auto mt-3 max-w-lg opacity-80">Sign in, paste a GitHub link and let Opero lay out every page and feature.</p>
          <Link to={cta} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-card px-5 py-3 font-semibold text-foreground">
            Get started <ArrowRight className="size-4" />
          </Link>
        </motion.div>
      </section>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">Opero · Created by Noubia Hance</footer>
    </div>
  );
}
