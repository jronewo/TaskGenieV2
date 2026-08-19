import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles, Eye, EyeOff, Mail, Lock, User, ArrowLeft,
  CheckCircle, AlertCircle, Loader2, ShieldCheck, Zap, BarChart2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../services/apiClient";
import { AccountBannedNotice, BanDetails } from "./AccountBannedNotice";
import { GoogleSignInButton } from "../auth/GoogleSignInButton";
import { authApi } from "../auth/authApi";

// Must match the backend's GoogleAuth:ClientId (src/TaskGenie.API/appsettings.json) so the ID
// token audience validates. No fallback: an unset/misconfigured client ID must not silently
// attempt Google sign-in.
const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

type AuthScreen = "login" | "register" | "forgot-password";

// ── Shared primitives ─────────────────────────────────────────────────────────

const AuthInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    hasError?: boolean;
    icon?: React.ReactNode;
    suffix?: React.ReactNode;
  }
>(({ hasError, icon, suffix, className = "", ...props }, ref) => (
  <div className="relative">
    {icon && (
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
        {icon}
      </span>
    )}
    <input
      ref={ref}
      className={`w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none transition-all bg-white
        ${icon ? "pl-10" : ""}
        ${suffix ? "pr-10" : ""}
        ${hasError
          ? "border-red-400 bg-red-50/40 focus:ring-2 focus:ring-red-100"
          : "border-gray-200 focus:border-[#1A237E] focus:ring-2 focus:ring-blue-100/60"
        }
        ${className}`}
      {...props}
    />
    {suffix && (
      <span className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</span>
    )}
  </div>
));
AuthInput.displayName = "AuthInput";

const AuthButton = ({
  children,
  loading,
  variant = "primary",
  type = "button",
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  loading?: boolean;
  variant?: "primary" | "ghost";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={loading || disabled}
    className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer
      ${variant === "primary"
        ? "bg-[#1A237E] text-white hover:bg-[#0D1757] disabled:opacity-55"
        : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-55"
      }`}
  >
    {loading ? <Loader2 size={15} className="animate-spin" /> : children}
  </button>
);

const FormField = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
    {children}
    {error && (
      <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
        <AlertCircle size={11} /> {error}
      </p>
    )}
  </div>
);

const PasswordStrengthBar = ({ password }: { password: string }) => {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = [
    { label: "Very Weak", color: "#EF4444" },
    { label: "Weak", color: "#F97316" },
    { label: "Fair", color: "#F59E0B" },
    { label: "Strong", color: "#22C55E" },
    { label: "Very Strong", color: "#16A34A" },
  ];
  const { label, color } = levels[Math.min(score, 4)];
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: n <= score ? color : "#E5E7EB" }}
          />
        ))}
      </div>
      <p className="text-[10px] font-semibold" style={{ color }}>
        Password strength: {label}
      </p>
    </div>
  );
};

// ── Left branding panel ───────────────────────────────────────────────────────

const LeftPanel = () => (
  <div
    className="hidden md:flex w-[42%] h-full flex-col justify-between p-10 text-white shrink-0"
    style={{ background: "#1A237E" }}
  >
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#0D1757" }}>
        <Sparkles size={20} className="text-blue-300" />
      </div>
      <div>
        <div className="font-bold text-xl tracking-wide">TaskGenie</div>
        <div className="text-blue-400 text-xs">AI Task Intelligence</div>
      </div>
    </div>

    <div>
      <h1 className="text-3xl font-bold leading-tight mb-4">
        Executive-Grade Project Intelligence
      </h1>
      <p className="text-blue-200 text-sm leading-relaxed mb-8">
        The AI-powered console built for project leaders who need real-time visibility,
        predictive risk detection, and data-driven team allocation.
      </p>
      <div className="space-y-4">
        {[
          { icon: Zap, text: "AI Risk Prediction Engine", sub: "Early warning on deadline conflicts" },
          { icon: BarChart2, text: "Real-time Project Analytics", sub: "Live dashboards for every project" },
          { icon: CheckCircle, text: "Smart Team Allocation", sub: "AI-optimized resource matching" },
        ].map(({ icon: Icon, text, sub }) => (
          <div key={text} className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <Icon size={15} className="text-blue-200" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{text}</p>
              <p className="text-xs text-blue-300">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="flex items-center gap-2 text-blue-400">
      <ShieldCheck size={13} />
      <span className="text-xs">Enterprise-grade security · SOC 2 compliant</span>
    </div>
  </div>
);

// ── Screen components ─────────────────────────────────────────────────────────

const SLIDE = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.18 },
};

const validate = {
  email: (v: string) => {
    if (!v) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Invalid email format";
    return "";
  },
  required: (v: string, label: string) => (!v ? `${label} is required` : ""),
  password: (v: string) => {
    if (!v) return "Password is required";
    if (v.length < 8) return "Minimum 8 characters";
    return "";
  },
  match: (a: string, b: string) => (a !== b ? "Passwords do not match" : ""),
};

function messageFromError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  return fallback;
}

const OrDivider = () => (
  <div className="flex items-center gap-3 my-4">
    <div className="flex-1 h-px bg-gray-200" />
    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">or</span>
    <div className="flex-1 h-px bg-gray-200" />
  </div>
);

// Login
const LoginScreen = ({
  onForgot,
  onRegister,
}: {
  onForgot: () => void;
  onRegister: () => void;
}) => {
  const { login, loginWithGoogle } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  // A suspension is not a form error — retyping the password will never fix it, so it takes over
  // the screen with the end date instead of sitting in the red strip.
  const [ban, setBan] = useState<BanDetails | null>(null);

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  /** The API answers a banned sign-in with 403 and ACCOUNT_BANNED plus the end date. */
  const asBan = (err: unknown): BanDetails | null => {
    if (!(err instanceof ApiError) || err.status !== 403) return null;
    const body = err.details as BanDetails & { code?: string };
    return body?.code === "ACCOUNT_BANNED" ? body : null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const ee = validate.email(form.email); if (ee) errs.email = ee;
    const pe = validate.password(form.password); if (pe) errs.password = pe;
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setApiError("");
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name ?? user.email}!`);
    } catch (err) {
      const banned = asBan(err);
      if (banned) setBan(banned);
      else setApiError(messageFromError(err, "Unable to sign in. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  if (ban) return <AccountBannedNotice details={ban} onBack={() => setBan(null)} />;

  const handleGoogleCredential = async (idToken: string) => {
    setApiError("");
    try {
      const user = await loginWithGoogle(idToken);
      toast.success(`Welcome, ${user.name ?? user.email}!`);
    } catch (err) {
      setApiError(messageFromError(err, "Google sign-in failed."));
    }
  };

  return (
    <motion.div {...SLIDE}>
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
        <p className="text-sm text-gray-500">Sign in to your TaskGenie console</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Email address" error={errors.email}>
          <AuthInput
            type="email" placeholder="you@company.com"
            value={form.email} onChange={(e) => f("email", e.target.value)}
            hasError={!!errors.email} icon={<Mail size={15} />}
            autoComplete="email"
          />
        </FormField>
        <FormField label="Password" error={errors.password}>
          <AuthInput
            type={showPw ? "text" : "password"} placeholder="Enter your password"
            value={form.password} onChange={(e) => f("password", e.target.value)}
            hasError={!!errors.password} icon={<Lock size={15} />}
            autoComplete="current-password"
            suffix={
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
        </FormField>
        <div className="flex items-center justify-end">
          <button type="button" onClick={onForgot} className="text-xs font-semibold text-[#1A237E] hover:text-[#0D1757] cursor-pointer">
            Forgot password?
          </button>
        </div>
        {apiError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle size={14} /> {apiError}
          </div>
        )}
        <div className="pt-1">
          <AuthButton type="submit" loading={loading}>Sign In</AuthButton>
        </div>
        <p className="text-center text-xs text-gray-500">
          Don't have an account?{" "}
          <button type="button" onClick={onRegister} className="text-[#1A237E] font-semibold hover:text-[#0D1757] cursor-pointer">
            Sign up free
          </button>
        </p>
      </form>
      <OrDivider />
      {GOOGLE_CLIENT_ID ? (
        <GoogleSignInButton
          clientId={GOOGLE_CLIENT_ID}
          onCredential={handleGoogleCredential}
          onError={(message) => setApiError(message)}
        />
      ) : (
        <p className="text-xs text-gray-400 text-center border border-dashed border-gray-200 rounded-lg py-2.5 select-none">
          Google sign-in is not configured (missing VITE_GOOGLE_CLIENT_ID).
        </p>
      )}
    </motion.div>
  );
};

// Register — a successful call already authenticates the user (backend issues a token
// immediately, no separate OTP step exists), so the parent unmounts this screen automatically.
const RegisterScreen = ({
  onBack,
}: {
  onBack: () => void;
}) => {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [showCp, setShowCp] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  // A suspension is not a form error — retyping the password will never fix it, so it takes over
  // the screen with the end date instead of sitting in the red strip.
  const [ban, setBan] = useState<BanDetails | null>(null);

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  /** The API answers a banned sign-in with 403 and ACCOUNT_BANNED plus the end date. */
  const asBan = (err: unknown): BanDetails | null => {
    if (!(err instanceof ApiError) || err.status !== 403) return null;
    const body = err.details as BanDetails & { code?: string };
    return body?.code === "ACCOUNT_BANNED" ? body : null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const ne = validate.required(form.name, "Full name"); if (ne) errs.name = ne;
    const ee = validate.email(form.email); if (ee) errs.email = ee;
    const pe = validate.password(form.password); if (pe) errs.password = pe;
    const ce = validate.match(form.password, form.confirm); if (ce) errs.confirm = ce;
    if (!form.confirm) errs.confirm = "Please confirm your password";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setApiError("");
    try {
      await register(form.name, form.email, form.password);
      toast.success("Account created. Welcome to TaskGenie!");
    } catch (err) {
      setApiError(messageFromError(err, "Unable to create account. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div {...SLIDE}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-5 cursor-pointer">
        <ArrowLeft size={14} /> Back to Login
      </button>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h2>
        <p className="text-sm text-gray-500">Join TaskGenie as a project leader</p>
      </div>
      <form onSubmit={submit} className="space-y-3.5">
        <FormField label="Full Name" error={errors.name}>
          <AuthInput
            type="text" placeholder="Huy Pham"
            value={form.name} onChange={(e) => f("name", e.target.value)}
            hasError={!!errors.name} icon={<User size={15} />}
            autoComplete="name"
          />
        </FormField>
        <FormField label="Email address" error={errors.email}>
          <AuthInput
            type="email" placeholder="you@company.com"
            value={form.email} onChange={(e) => f("email", e.target.value)}
            hasError={!!errors.email} icon={<Mail size={15} />}
            autoComplete="email"
          />
        </FormField>
        <FormField label="Password" error={errors.password}>
          <AuthInput
            type={showPw ? "text" : "password"} placeholder="Min. 8 characters"
            value={form.password} onChange={(e) => f("password", e.target.value)}
            hasError={!!errors.password} icon={<Lock size={15} />}
            autoComplete="new-password"
            suffix={
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
          <PasswordStrengthBar password={form.password} />
        </FormField>
        <FormField label="Confirm Password" error={errors.confirm}>
          <AuthInput
            type={showCp ? "text" : "password"} placeholder="Re-enter password"
            value={form.confirm} onChange={(e) => f("confirm", e.target.value)}
            hasError={!!errors.confirm} icon={<Lock size={15} />}
            autoComplete="new-password"
            suffix={
              <button type="button" onClick={() => setShowCp(!showCp)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                {showCp ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
        </FormField>
        {apiError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle size={14} /> {apiError}
          </div>
        )}
        <div className="pt-1">
          <AuthButton type="submit" loading={loading}>Create Account</AuthButton>
        </div>
      </form>
    </motion.div>
  );
};

// Forgot / reset password. The request step always reports the same message whether or not the
// address exists, so the form can't be used to enumerate registered emails. The token itself is
// delivered out of band (email) — it is never returned by the API.
const ForgotPasswordScreen = ({ onBack }: { onBack: () => void }) => {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const fail = (err: unknown) =>
    setError(err instanceof ApiError && err.message ? err.message : "Something went wrong. Please try again.");

  const handleRequest = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await authApi.forgotPassword(email.trim());
      setSent(true);
      toast.success(result.message);
      setStep("reset");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await authApi.resetPassword(token.trim(), password);
      toast.success(result.message);
      onBack();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div {...SLIDE}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-5 cursor-pointer">
        <ArrowLeft size={14} /> Back to Login
      </button>
      <div className="mb-4">
        <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center mb-4">
          <Lock size={22} className="text-[#1A237E]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Reset your password</h2>
        <p className="text-sm text-gray-500">
          {step === "request"
            ? "We'll send a one-time reset link to your email."
            : "Enter the token from the email along with your new password."}
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-3 flex items-start gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </div>
      )}
      {sent && step === "reset" && (
        <div role="status" className="mb-3 flex items-start gap-2 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <CheckCircle size={13} className="mt-0.5 shrink-0" aria-hidden />
          If that email is registered, a reset link is on its way.
        </div>
      )}

      {step === "request" ? (
        <>
          <FormField label="Email">
            <AuthInput
              type="email"
              placeholder="you@company.com"
              icon={<Mail size={15} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <div className="mt-4">
            <AuthButton onClick={handleRequest} loading={busy} disabled={!email.trim()}>
              Send reset link
            </AuthButton>
          </div>
          <button
            type="button"
            onClick={() => setStep("reset")}
            className="mt-3 w-full text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            I already have a reset token
          </button>
        </>
      ) : (
        <>
          <div className="space-y-3">
            <FormField label="Reset token">
              <AuthInput
                type="text"
                placeholder="Paste the token from your email"
                icon={<ShieldCheck size={15} />}
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </FormField>
            <FormField label="New password">
              <AuthInput
                type="password"
                placeholder="Min. 6 characters"
                icon={<Lock size={15} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>
            <FormField label="Confirm password">
              <AuthInput
                type="password"
                placeholder="Re-enter password"
                icon={<Lock size={15} />}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </FormField>
          </div>
          <div className="mt-4">
            <AuthButton onClick={handleReset} loading={busy} disabled={!token.trim() || password.length < 6}>
              Reset password
            </AuthButton>
          </div>
          <p className="mt-3 text-center text-[11px] text-gray-400">
            Resetting signs you out everywhere — sign in again with the new password.
          </p>
        </>
      )}
    </motion.div>
  );
};

// ── Main AuthModule ───────────────────────────────────────────────────────────

export const AuthModule = () => {
  const [screen, setScreen] = useState<AuthScreen>("login");
  const go = (s: AuthScreen) => setScreen(s);

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
    >
      <LeftPanel />

      {/* Right: form panel */}
      <div className="flex-1 h-full flex items-center justify-center p-8 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-[400px]">
          <AnimatePresence mode="wait">
            {screen === "login" && (
              <LoginScreen
                key="login"
                onForgot={() => go("forgot-password")}
                onRegister={() => go("register")}
              />
            )}
            {screen === "register" && (
              <RegisterScreen key="register" onBack={() => go("login")} />
            )}
            {screen === "forgot-password" && (
              <ForgotPasswordScreen key="forgot-password" onBack={() => go("login")} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
