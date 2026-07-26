import React, { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { AuthInput, AuthButton, FormField, LeftPanel, validate } from "../components/AuthPrimitives";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate.email(email);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    toast.error("Tính năng đặt lại mật khẩu chưa được backend hỗ trợ. Vui lòng liên hệ quản trị viên.");
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
      <LeftPanel />
      <div className="flex-1 h-full flex items-center justify-center p-8 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-[400px]">
          <Link to="/login" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-5">
            <ArrowLeft size={14} /> Back to Login
          </Link>
          <div className="mb-7">
            <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Lock size={22} className="text-[#1A237E]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Reset your password</h2>
            <p className="text-sm text-gray-500">Enter your account email and we'll send you a verification code.</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <FormField label="Email address" error={error}>
              <AuthInput type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} hasError={!!error} icon={<Mail size={15} />} />
            </FormField>
            <AuthButton type="submit">Send Reset Code</AuthButton>
          </form>
        </div>
      </div>
    </div>
  );
}
