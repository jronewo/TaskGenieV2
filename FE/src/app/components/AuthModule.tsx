import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles, Eye, EyeOff, Mail, Lock, User, ArrowLeft,
  CheckCircle, AlertCircle, Loader2, ShieldCheck, Zap,
  BarChart2, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

type AuthScreen =
  | "login"
  | "register"
  | "verify-register"
  | "forgot-password"
  | "verify-reset"
  | "set-password";

type SuccessType = "register" | "reset" | null;

interface AuthModuleProps {
  onLogin: () => void;
}

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

const OTPInput = ({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) => {
  const refs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));
  const digits = value.padEnd(6, "").split("").slice(0, 6);

  const handleChange = (i: number, char: string) => {
    if (!/^\d*$/.test(char)) return;
    const next = [...digits];
    next[i] = char.slice(-1);
    onChange(next.join("").trimEnd());
    if (char && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
    e.preventDefault();
  };

  return (
    <div>
      <div className="flex gap-2.5 justify-center">
        {Array.from({ length: 6 }, (_, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            className={`w-12 h-13 text-center border rounded-lg outline-none transition-all font-mono
              ${error
                ? "border-red-400 bg-red-50/40"
                : digits[i]
                ? "border-[#1A237E] bg-blue-50/30"
                : "border-gray-200"
              }
              focus:border-[#1A237E] focus:ring-2 focus:ring-blue-100/60`}
            style={{ fontSize: "1.25rem", fontWeight: 700 }}
            maxLength={1}
            value={digits[i] || ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            inputMode="numeric"
          />
        ))}
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-2 text-center flex items-center justify-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
};

const OTPCountdown = ({ onResend }: { onResend: () => void }) => {
  const [seconds, setSeconds] = useState(60);
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return (
    <p className="text-xs text-gray-500 text-center">
      {seconds > 0 ? (
        <>Resend code in <span className="font-semibold text-gray-700">{seconds}s</span></>
      ) : (
        <button
          type="button"
          onClick={() => { setSeconds(60); onResend(); }}
          className="flex items-center gap-1 text-[#1A237E] font-semibold hover:text-[#0D1757] mx-auto cursor-pointer"
        >
          <RefreshCw size={12} /> Resend Code
        </button>
      )}
    </p>
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
        <div className="font-bold text-xl tracking-wide">TMAI</div>
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

// Login
const LoginScreen = ({
  onLogin,
  onForgot,
  onRegister,
}: {
  onLogin: () => void;
  onForgot: () => void;
  onRegister: () => void;
}) => {
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const f = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const ee = validate.email(form.email); if (ee) errs.email = ee;
    const pe = validate.password(form.password); if (pe) errs.password = pe;
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setApiError("");
    await new Promise((r) => setTimeout(r, 1300));
    setLoading(false);
    toast.success("Welcome back, Huy Pham!");
    onLogin();
  };

  return (
    <motion.div {...SLIDE}>
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
        <p className="text-sm text-gray-500">Sign in to your TMAI console</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Email address" error={errors.email}>
          <AuthInput
            type="email" placeholder="you@company.com"
            value={form.email} onChange={(e) => f("email", e.target.value)}
            hasError={!!errors.email} icon={<Mail size={15} />}
          />
        </FormField>
        <FormField label="Password" error={errors.password}>
          <AuthInput
            type={showPw ? "text" : "password"} placeholder="Enter your password"
            value={form.password} onChange={(e) => f("password", e.target.value)}
            hasError={!!errors.password} icon={<Lock size={15} />}
            suffix={
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
        </FormField>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600">
            <input
              type="checkbox" checked={form.remember}
              onChange={(e) => f("remember", e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-[#1A237E]"
            />
            Remember me
          </label>
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
    </motion.div>
  );
};

// Register
const RegisterScreen = ({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) => {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [showCp, setShowCp] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const ne = validate.required(form.name, "Full name"); if (ne) errs.name = ne;
    const ee = validate.email(form.email); if (ee) errs.email = ee;
    const pe = validate.password(form.password); if (pe) errs.password = pe;
    const ce = validate.match(form.password, form.confirm); if (ce) errs.confirm = ce;
    if (!form.confirm) errs.confirm = "Please confirm your password";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    toast.info("Verification code sent to " + form.email);
    onNext();
  };

  return (
    <motion.div {...SLIDE}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-5 cursor-pointer">
        <ArrowLeft size={14} /> Back to Login
      </button>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h2>
        <p className="text-sm text-gray-500">Join TMAI as a project leader</p>
      </div>
      <form onSubmit={submit} className="space-y-3.5">
        <FormField label="Full Name" error={errors.name}>
          <AuthInput
            type="text" placeholder="Huy Pham"
            value={form.name} onChange={(e) => f("name", e.target.value)}
            hasError={!!errors.name} icon={<User size={15} />}
          />
        </FormField>
        <FormField label="Email address" error={errors.email}>
          <AuthInput
            type="email" placeholder="you@company.com"
            value={form.email} onChange={(e) => f("email", e.target.value)}
            hasError={!!errors.email} icon={<Mail size={15} />}
          />
        </FormField>
        <FormField label="Password" error={errors.password}>
          <AuthInput
            type={showPw ? "text" : "password"} placeholder="Min. 8 characters"
            value={form.password} onChange={(e) => f("password", e.target.value)}
            hasError={!!errors.password} icon={<Lock size={15} />}
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
            suffix={
              <button type="button" onClick={() => setShowCp(!showCp)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                {showCp ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
        </FormField>
        <div className="pt-1">
          <AuthButton type="submit" loading={loading}>Create Account</AuthButton>
        </div>
      </form>
    </motion.div>
  );
};

// OTP Verify
const VerifyOTPScreen = ({
  title,
  description,
  onVerify,
  onBack,
}: {
  title: string;
  description: string;
  onVerify: () => void;
  onBack: () => void;
}) => {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) { setError("Please enter the full 6-digit code"); return; }
    setLoading(true); setError("");
    await new Promise((r) => setTimeout(r, 1100));
    setLoading(false);
    onVerify();
  };

  const handleResend = () => toast.info("Verification code resent.");

  return (
    <motion.div {...SLIDE}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-5 cursor-pointer">
        <ArrowLeft size={14} /> Back
      </button>
      <div className="mb-7">
        <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center mb-4">
          <Mail size={22} className="text-[#1A237E]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <form onSubmit={submit} className="space-y-5">
        <OTPInput value={otp} onChange={setOtp} error={error} />
        <AuthButton type="submit" loading={loading} disabled={otp.length < 6}>
          Verify Code
        </AuthButton>
        <OTPCountdown onResend={handleResend} />
      </form>
    </motion.div>
  );
};

// Forgot Password (request reset)
const ForgotPasswordScreen = ({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate.email(email); if (err) { setError(err); return; }
    setLoading(true); setError("");
    await new Promise((r) => setTimeout(r, 1100));
    setLoading(false); setSent(true);
    toast.info("If this email exists, a reset code has been sent.");
    onNext();
  };

  return (
    <motion.div {...SLIDE}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-5 cursor-pointer">
        <ArrowLeft size={14} /> Back to Login
      </button>
      <div className="mb-7">
        <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center mb-4">
          <Lock size={22} className="text-[#1A237E]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Reset your password</h2>
        <p className="text-sm text-gray-500">
          Enter your account email and we'll send you a verification code.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Email address" error={error}>
          <AuthInput
            type="email" placeholder="you@company.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            hasError={!!error} icon={<Mail size={15} />}
          />
        </FormField>
        {sent && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <CheckCircle size={14} /> Code sent — check your inbox
          </div>
        )}
        <AuthButton type="submit" loading={loading}>Send Reset Code</AuthButton>
      </form>
    </motion.div>
  );
};

// Set New Password
const SetPasswordScreen = ({
  onSuccess,
}: {
  onSuccess: () => void;
}) => {
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const pe = validate.password(form.password); if (pe) errs.password = pe;
    const ce = validate.match(form.password, form.confirm); if (ce) errs.confirm = ce;
    if (!form.confirm) errs.confirm = "Please confirm your password";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    onSuccess();
  };

  return (
    <motion.div {...SLIDE}>
      <div className="mb-7">
        <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center mb-4">
          <ShieldCheck size={22} className="text-[#1A237E]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Set new password</h2>
        <p className="text-sm text-gray-500">Choose a strong password for your account.</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <FormField label="New Password" error={errors.password}>
          <AuthInput
            type={showPw ? "text" : "password"} placeholder="Min. 8 characters"
            value={form.password} onChange={(e) => f("password", e.target.value)}
            hasError={!!errors.password} icon={<Lock size={15} />}
            suffix={
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
          <PasswordStrengthBar password={form.password} />
        </FormField>
        <FormField label="Confirm New Password" error={errors.confirm}>
          <AuthInput
            type="password" placeholder="Re-enter new password"
            value={form.confirm} onChange={(e) => f("confirm", e.target.value)}
            hasError={!!errors.confirm} icon={<Lock size={15} />}
          />
        </FormField>
        <div className="pt-1">
          <AuthButton type="submit" loading={loading}>Reset Password</AuthButton>
        </div>
      </form>
    </motion.div>
  );
};

// Success Modal (screens 4 & 8)
const SuccessModal = ({
  type,
  onContinue,
}: {
  type: SuccessType;
  onContinue: () => void;
}) => {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(t); onContinue(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const isRegister = type === "register";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
      <motion.div
        className="relative bg-white border border-gray-200 rounded-xl p-8 max-w-sm w-full shadow-2xl z-10 text-center"
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 280 }}
      >
        <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={30} className="text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {isRegister ? "Account Created!" : "Password Updated!"}
        </h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          {isRegister
            ? "Your account has been successfully created. You can now sign in."
            : "Your password has been successfully updated. Please sign in."}
        </p>
        <button
          onClick={onContinue}
          className="w-full py-2.5 bg-[#1A237E] text-white text-sm font-semibold rounded-lg hover:bg-[#0D1757] transition-colors mb-3 cursor-pointer"
        >
          {isRegister ? "Go to Login" : "Return to Login"}
        </button>
        <p className="text-xs text-gray-400">
          Redirecting automatically in <span className="font-semibold">{countdown}s</span>
        </p>
      </motion.div>
    </motion.div>
  );
};

// ── Main AuthModule ───────────────────────────────────────────────────────────

export const AuthModule = ({ onLogin }: AuthModuleProps) => {
  const [screen, setScreen] = useState<AuthScreen>("login");
  const [success, setSuccess] = useState<SuccessType>(null);

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
                onLogin={onLogin}
                onForgot={() => go("forgot-password")}
                onRegister={() => go("register")}
              />
            )}
            {screen === "register" && (
              <RegisterScreen
                key="register"
                onNext={() => go("verify-register")}
                onBack={() => go("login")}
              />
            )}
            {screen === "verify-register" && (
              <VerifyOTPScreen
                key="verify-register"
                title="Verify Your Email"
                description="Enter the 6-digit code sent to your email address to activate your account."
                onVerify={() => setSuccess("register")}
                onBack={() => go("register")}
              />
            )}
            {screen === "forgot-password" && (
              <ForgotPasswordScreen
                key="forgot-password"
                onNext={() => go("verify-reset")}
                onBack={() => go("login")}
              />
            )}
            {screen === "verify-reset" && (
              <VerifyOTPScreen
                key="verify-reset"
                title="Check Your Email"
                description="Enter the 6-digit reset code we sent. The code expires in 10 minutes."
                onVerify={() => go("set-password")}
                onBack={() => go("forgot-password")}
              />
            )}
            {screen === "set-password" && (
              <SetPasswordScreen
                key="set-password"
                onSuccess={() => setSuccess("reset")}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Success modals */}
      <AnimatePresence>
        {success && (
          <SuccessModal
            key="success"
            type={success}
            onContinue={() => { setSuccess(null); go("login"); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
