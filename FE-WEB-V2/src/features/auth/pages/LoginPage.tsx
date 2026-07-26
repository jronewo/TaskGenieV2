import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AuthInput, AuthButton, FormField, LeftPanel } from "../components/AuthPrimitives";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { authApi } from "../api/authApi";
import { useAuth } from "../../../core/auth/AuthContext";
import { ApiError } from "../../../core/api/client";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { loginWithResponse } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [apiError, setApiError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setApiError("");
    try {
      const response = await authApi.login(values);
      loginWithResponse(response);
      toast.success(response.message || `Welcome back, ${response.name ?? response.email}!`);
      navigate("/app", { replace: true });
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Đăng nhập thất bại.");
    }
  };

  const handleGoogleCredential = async (idToken: string) => {
    setApiError("");
    try {
      const response = await authApi.google({ idToken });
      loginWithResponse(response);
      toast.success(response.message || "Đăng nhập Google thành công.");
      navigate("/app", { replace: true });
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Đăng nhập Google thất bại.");
    }
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
      <LeftPanel />
      <div className="flex-1 h-full flex items-center justify-center p-8 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-[400px]">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-sm text-gray-500">Sign in to your TaskGenie console</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Email address" error={errors.email?.message}>
              <AuthInput type="email" placeholder="you@company.com" hasError={!!errors.email} icon={<Mail size={15} />} {...register("email")} />
            </FormField>
            <FormField label="Password" error={errors.password?.message}>
              <AuthInput
                type={showPw ? "text" : "password"}
                placeholder="Enter your password"
                hasError={!!errors.password}
                icon={<Lock size={15} />}
                suffix={
                  <button type="button" onClick={() => setShowPw(!showPw)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
                {...register("password")}
              />
            </FormField>
            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-xs font-semibold text-[#1A237E] hover:text-[#0D1757]">
                Forgot password?
              </Link>
            </div>
            {apiError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={14} /> {apiError}
              </div>
            )}
            <div className="pt-1">
              <AuthButton type="submit" loading={isSubmitting}>
                Sign In
              </AuthButton>
            </div>
            <div className="relative py-1 text-center">
              <span className="text-[10px] text-gray-400 bg-gray-50 px-2 relative z-10">or</span>
              <div className="absolute inset-x-0 top-1/2 border-t border-gray-200" />
            </div>
            <GoogleSignInButton onCredential={handleGoogleCredential} />
            <p className="text-center text-xs text-gray-500">
              Don't have an account?{" "}
              <Link to="/register" className="text-[#1A237E] font-semibold hover:text-[#0D1757]">
                Sign up free
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
