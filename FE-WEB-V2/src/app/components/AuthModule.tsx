import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Sparkles, AlertCircle, Loader2, ShieldCheck, Zap, BarChart2, CheckCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../services/apiClient";

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GOOGLE_SCRIPT_ID = "google-identity-services";

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

// ── Google Identity Services button ───────────────────────────────────────────

function useGoogleScriptReady() {
  const [ready, setReady] = useState(!!window.google?.accounts?.id);

  useEffect(() => {
    if (ready) return;
    const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      return;
    }
    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, [ready]);

  return ready;
}

const GoogleSignInButton = ({
  onCredential,
  onError,
}: {
  onCredential: (idToken: string) => void;
  onError: (message: string) => void;
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const scriptReady = useGoogleScriptReady();

  useEffect(() => {
    if (!scriptReady || !buttonRef.current) return;
    if (!GOOGLE_CLIENT_ID) {
      onError("Google Sign-In is not configured (missing VITE_GOOGLE_CLIENT_ID).");
      return;
    }
    if (!window.google) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: { credential: string }) => onCredential(response.credential),
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      width: 336,
      text: "continue_with",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady]);

  if (!scriptReady) {
    return (
      <div className="flex items-center justify-center py-3 text-gray-400">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return <div ref={buttonRef} className="flex justify-center" />;
};

// ── Main AuthModule ───────────────────────────────────────────────────────────

export const AuthModule = () => {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const handleCredential = async (idToken: string) => {
    setLoading(true);
    setApiError("");
    try {
      await loginWithGoogle(idToken);
    } catch (error) {
      setApiError(error instanceof ApiError ? error.message : "Unable to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
    >
      <LeftPanel />

      <div className="flex-1 h-full flex items-center justify-center p-8 bg-gray-50">
        <motion.div
          className="w-full max-w-[400px] text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome to TMAI</h2>
            <p className="text-sm text-gray-500">Sign in with your Google account to continue</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-8">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-3">
                <Loader2 size={22} className="animate-spin text-[#1A237E]" />
                <p className="text-xs text-gray-500">Signing you in…</p>
              </div>
            ) : (
              <GoogleSignInButton onCredential={handleCredential} onError={setApiError} />
            )}

            {apiError && (
              <div className="flex items-center gap-2 p-3 mt-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-left">
                <AlertCircle size={14} className="shrink-0" /> {apiError}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-6">
            By continuing you agree to TMAI's Terms of Service and Privacy Policy.
          </p>
        </motion.div>
      </div>
    </div>
  );
};
