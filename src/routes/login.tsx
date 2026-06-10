import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Mail, ShieldCheck, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  registerAccount,
  sendVerificationCode,
  loginAccount,
  isEmailRegistered,
  getRememberedCredentials,
  setRememberedCredentials,
} from "@/lib/auth-store";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — KidHealth Log" },
      { name: "description", content: "Sign in or create your KidHealth Log account." },
    ],
  }),
  component: LoginPage,
});

type AuthMode = "login" | "register";

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const remembered = getRememberedCredentials();
    if (remembered) {
      setEmail(remembered.email);
      setPassword(remembered.password);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const switchToLogin = (message?: string) => {
    setMode("login");
    setCode("");
    setAgreed(false);
    if (message) {
      toast.info(message);
    }
  };

  const checkRegisteredEmail = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed.includes("@")) return;
    if (isEmailRegistered(trimmed)) {
      switchToLogin("This email is already registered. Please sign in.");
    }
  };

  const handleSendCode = () => {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      toast.error("Enter a valid email first");
      return;
    }
    if (isEmailRegistered(trimmed)) {
      switchToLogin("This email is already registered. Please sign in.");
      return;
    }
    try {
      const mockCode = sendVerificationCode(trimmed);
      setCountdown(60);
      toast.success("Verification code sent", {
        description: `Mock code: ${mockCode} (demo only)`,
        duration: 8000,
      });
    } catch (e) {
      if (e instanceof Error && e.message === "ALREADY_REGISTERED") {
        switchToLogin("This email is already registered. Please sign in.");
        return;
      }
      toast.error("Could not send code", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  const handleLogin = () => {
    setSubmitting(true);
    try {
      loginAccount(email, password);
      if (rememberMe) {
        setRememberedCredentials({ email: email.trim().toLowerCase(), password });
      } else {
        setRememberedCredentials(null);
      }
      toast.success("Welcome back!");
      navigate({ to: "/" });
    } catch (e) {
      toast.error("Sign in failed", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = () => {
    if (!agreed) return;
    setSubmitting(true);
    try {
      registerAccount(email, password, code);
      if (rememberMe) {
        setRememberedCredentials({ email: email.trim().toLowerCase(), password });
      }
      toast.success("Account created", { description: "Welcome to KidHealth Log!" });
      navigate({ to: "/" });
    } catch (e) {
      if (e instanceof Error && e.message === "ALREADY_REGISTERED") {
        switchToLogin("This email is already registered. Please sign in.");
      } else {
        toast.error("Registration failed", {
          description: e instanceof Error ? e.message : "Please try again.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canLogin =
    email.trim().includes("@") && password.length >= 6 && !submitting;

  const canRegister =
    agreed &&
    email.trim().includes("@") &&
    code.trim().length >= 4 &&
    password.length >= 6 &&
    !submitting;

  return (
    <main className="min-h-[100dvh] bg-background flex justify-center">
      <div className="w-full max-w-[390px] px-5 py-8 flex flex-col">
        <div className="text-center mb-6">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-primary-foreground shadow-[var(--shadow-soft)]"
            style={{ background: "var(--gradient-primary)" }}
          >
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Sign in to continue tracking your child's health."
              : "Sign up with your email to start logging."}
          </p>
        </div>

        <div className="flex rounded-xl bg-muted/60 p-0.5 mb-5">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
              mode === "login"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
              mode === "register"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => mode === "register" && checkRegisteredEmail(email)}
                placeholder="you@example.com"
                className="pl-9 rounded-xl"
                autoComplete="email"
              />
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Verification Code</label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6-digit code"
                  className="rounded-xl flex-1"
                  inputMode="numeric"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                  className="shrink-0 rounded-xl border border-border px-3 text-xs font-semibold transition hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed min-w-[88px]"
                >
                  {countdown > 0 ? `${countdown}s` : "Send"}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="mt-1 rounded-xl"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {mode === "login" ? (
            <label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox
                checked={rememberMe}
                onCheckedChange={(v) => setRememberMe(v === true)}
              />
              <span className="text-xs text-muted-foreground">Remember password</span>
            </label>
          ) : (
            <label className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-3 cursor-pointer">
              <Checkbox
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
              />
              <span className="text-xs leading-relaxed text-muted-foreground">
                I am 18 years old or older and agree to the Terms of Service
              </span>
            </label>
          )}

          {mode === "login" ? (
            <button
              type="button"
              onClick={handleLogin}
              disabled={!canLogin}
              className="w-full rounded-xl py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-soft)" }}
            >
              <LogIn className="h-4 w-4" />
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRegister}
              disabled={!canRegister}
              className="w-full rounded-xl py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-soft)" }}
            >
              {submitting ? "Creating account…" : "Create Account"}
            </button>
          )}
        </div>

        <p className="mt-8 text-center text-[10px] text-muted-foreground">
          KidHealth Log · Mock auth (local storage)
        </p>
      </div>
    </main>
  );
}
