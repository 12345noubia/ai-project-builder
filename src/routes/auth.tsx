import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Lock, Mail, User, Loader2, Workflow, Bot, Github } from "lucide-react";
import { toast } from "sonner";
import side from "@/assets/auth-side.jpg";
import { Logo } from "@/components/app/Logo";
import { GoogleButton } from "@/components/app/GoogleButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Opero" },
      { name: "description", content: "Sign in or create your Opero account to build AI workflows." },
      { property: "og:title", content: "Sign in — Opero" },
      { property: "og:description", content: "Sign in or create your Opero account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) nav({ to: "/app" }); }, [user, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else {
      const { error, data } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/auth", data: { full_name: name } } });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Check your email to confirm your account.");
    }
    setBusy(false);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-hero p-4">
      <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5 }}
        className="grid w-full max-w-4xl overflow-hidden rounded-3xl border bg-card shadow-glow md:grid-cols-2">
        <div className="relative hidden md:block">
          <img src={side} width={896} height={1280} alt="Glowing workflow graph" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 space-y-2 p-6">
            {[{ i: Workflow, t: "Visual workflows" }, { i: Bot, t: "AI copilot built in" }, { i: Github, t: "Import any GitHub repo" }].map((x, k) => (
              <motion.div key={x.t} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + k * 0.15 }}
                className="flex items-center gap-2 rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-2 text-sm font-medium text-primary-foreground backdrop-blur">
                <x.i className="size-4" /> {x.t}
              </motion.div>
            ))}
          </div>
        </div>
        <div className="p-7 sm:p-10">
          <Logo />
          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <h1 className="mt-6 text-2xl font-bold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{mode === "signin" ? "Sign in to continue building." : "Start automating in minutes."}</p>
              <div className="mt-6"><GoogleButton /></div>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
              <form onSubmit={submit} className="space-y-3">
                {mode === "signup" && <Field icon={User} placeholder="Full name" value={name} onChange={setName} />}
                <Field icon={Mail} type="email" placeholder="Email" value={email} onChange={setEmail} required />
                <Field icon={Lock} type="password" placeholder="Password" value={password} onChange={setPassword} required minLength={6} />
                <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
                  {busy && <Loader2 className="size-4 animate-spin" />}{mode === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>
              <p className="mt-5 text-center text-sm text-muted-foreground">
                {mode === "signin" ? "New to Opero?" : "Already have an account?"}{" "}
                <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="font-semibold text-primary">
                  {mode === "signin" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ icon: Icon, onChange, ...p }: { icon: typeof Mail; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-xl border bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
      <Icon className="size-4 text-muted-foreground" />
      <input {...p} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
    </label>
  );
}
