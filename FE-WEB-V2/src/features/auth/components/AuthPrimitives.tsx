import React from "react";
import { AlertCircle, Sparkles, Zap, BarChart2, CheckCircle, ShieldCheck } from "lucide-react";

export const AuthInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    hasError?: boolean;
    icon?: React.ReactNode;
    suffix?: React.ReactNode;
  }
>(({ hasError, icon, suffix, className = "", ...props }, ref) => (
  <div className="relative">
    {icon && (
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</span>
    )}
    <input
      ref={ref}
      className={`w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none transition-all bg-white
        ${icon ? "pl-10" : ""}
        ${suffix ? "pr-10" : ""}
        ${
          hasError
            ? "border-red-400 bg-red-50/40 focus:ring-2 focus:ring-red-100"
            : "border-gray-200 focus:border-[#1A237E] focus:ring-2 focus:ring-blue-100/60"
        }
        ${className}`}
      {...props}
    />
    {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</span>}
  </div>
));
AuthInput.displayName = "AuthInput";

export const AuthButton = ({
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
      ${
        variant === "primary"
          ? "bg-[#1A237E] text-white hover:bg-[#0D1757] disabled:opacity-55"
          : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-55"
      }`}
  >
    {loading ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : children}
  </button>
);

export const FormField = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
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

export const PasswordStrengthBar = ({ password }: { password: string }) => {
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
          <div key={n} className="flex-1 h-1 rounded-full transition-all duration-300" style={{ backgroundColor: n <= score ? color : "#E5E7EB" }} />
        ))}
      </div>
      <p className="text-[10px] font-semibold" style={{ color }}>
        Password strength: {label}
      </p>
    </div>
  );
};

export const validate = {
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

export const LeftPanel = () => (
  <div className="hidden md:flex w-[42%] h-full flex-col justify-between p-10 text-white shrink-0" style={{ background: "#1A237E" }}>
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
      <h1 className="text-3xl font-bold leading-tight mb-4">Executive-Grade Project Intelligence</h1>
      <p className="text-blue-200 text-sm leading-relaxed mb-8">
        The AI-powered console built for project leaders who need real-time visibility, predictive risk detection, and
        data-driven team allocation.
      </p>
      <div className="space-y-4">
        {[
          { icon: Zap, text: "AI Risk Prediction Engine", sub: "Early warning on deadline conflicts" },
          { icon: BarChart2, text: "Real-time Project Analytics", sub: "Live dashboards for every project" },
          { icon: CheckCircle, text: "Smart Team Allocation", sub: "AI-optimized resource matching" },
        ].map(({ icon: Icon, text, sub }) => (
          <div key={text} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(255,255,255,0.1)" }}>
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
      <span className="text-xs">Enterprise-grade security · JWT-based sessions</span>
    </div>
  </div>
);
