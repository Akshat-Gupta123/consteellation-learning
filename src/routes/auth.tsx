import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Rocket, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ConstellationMark } from "@/components/ConstellationMark";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Constellation" },
      {
        name: "description",
        content: "Sign in to Constellation to save your galaxies and learning progress.",
      },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const { status } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (status === "signedIn") {
      navigate({ to: "/", replace: true });
    }
  }, [status, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!email.trim() || password.length < 6) {
      toast.error("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success("Account created. Welcome aboard, cadet.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
      navigate({ to: "/", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not authenticate.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed.";
      toast.error(msg);
      setGoogleLoading(false);
    }
  }


  return (
    <main className="relative grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-md text-center">
        <Link to="/">
          <ConstellationMark className="animate-float-up mb-2" />
        </Link>
        <p className="animate-float-up text-sm text-muted-foreground" style={{ animationDelay: "60ms" }}>
          {mode === "signin"
            ? "Sign in to continue your learning journey."
            : "Create an account to save your galaxies and progress."}
        </p>

        <form
          onSubmit={submit}
          className="glass animate-float-up mt-8 space-y-3 rounded-2xl p-5 text-left"
          style={{ animationDelay: "120ms" }}
        >
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              autoComplete="email"
              placeholder="cadet@constellation.app"
              className="mt-1 w-full rounded-xl border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="At least 6 characters"
              className="mt-1 w-full rounded-xl border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>

          <Button type="submit" disabled={loading} className="mt-2 h-11 w-full glow-primary">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {mode === "signin" ? "Signing in…" : "Creating account…"}
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                {mode === "signin" ? "Sign in" : "Create account"}
              </>
            )}
          </Button>

          <div className="relative my-1 text-center">
            <span className="relative z-10 bg-card px-2 text-xs text-muted-foreground">or</span>
            <span className="absolute left-0 right-0 top-1/2 -z-0 h-px bg-border" />
          </div>

          <button
            type="button"
            onClick={google}
            disabled={googleLoading || loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/60 text-sm font-medium transition-colors hover:border-primary hover:bg-background"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleGlyph />
            )}
            Continue with Google
          </button>

          <p className="pt-2 text-center text-xs text-muted-foreground">
            {mode === "signin" ? (
              <>
                New to Constellation?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-medium text-primary hover:underline"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>

        <p className="animate-float-up mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground" style={{ animationDelay: "200ms" }}>
          <Sparkles className="h-3.5 w-3.5 text-cyan" /> Your progress, IC, and customizations save automatically.
        </p>
      </div>
    </main>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.4 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C40.9 36 44 30.5 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
