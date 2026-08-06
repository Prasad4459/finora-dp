import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — MoneyOS" },
      { name: "description", content: "Sign in or create your MoneyOS account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"auth" | "forgot">("auth");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/dashboard" },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Check your inbox to confirm your account.");
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return toast.error(result.error.message);
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return toast.error("Enter your email first.");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Password reset link sent. Check your inbox.");
  }

  if (mode === "forgot") {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground font-bold">
              M
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Forgot your password?</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We'll email you a secure link to set a new one.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            {sent ? (
              <p className="text-sm text-muted-foreground">
                If an account exists for <span className="font-medium text-foreground">{email}</span>,
                a reset link is on its way. The link opens the page where you set a new password.
              </p>
            ) : (
              <form onSubmit={sendReset} className="space-y-4">
                <Field label="Email" value={email} onChange={setEmail} type="email" />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            )}
            <Button
              variant="ghost"
              className="mt-3 w-full"
              onClick={() => {
                setMode("auth");
                setSent(false);
              }}
            >
              Back to sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground font-bold">
            M
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Welcome to MoneyOS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your finance workspace</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="mt-4 space-y-4">
                <Field label="Email" value={email} onChange={setEmail} type="email" />
                <Field label="Password" value={password} onChange={setPassword} type="password" />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="mt-4 space-y-4">
                <Field label="Email" value={email} onChange={setEmail} type="email" />
                <Field label="Password" value={password} onChange={setPassword} type="password" />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={google}>
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} type={type} required />
    </div>
  );
}
