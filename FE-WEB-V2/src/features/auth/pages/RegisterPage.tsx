import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AuthInput, AuthButton, FormField, PasswordStrengthBar, LeftPanel } from "../components/AuthPrimitives";
import { authApi } from "../api/authApi";
import { useAuth } from "../../../core/auth/AuthContext";
import { ApiError } from "../../../core/api/client";

const schema = z
  .object({
    name: z.string().min(1, "Full name is required"),
    email: z.string().min(1, "Email is required").email("Invalid email format"),
    password: z.string().min(8, "Minimum 8 characters"),
    confirm: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { loginWithResponse } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [showCp, setShowCp] = useState(false);
  const [apiError, setApiError] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", password: "", confirm: "" } });

  const onSubmit = async (values: FormValues) => {
    setApiError("");
    try {
      const response = await authApi.register({ name: values.name, email: values.email, password: values.password });
      loginWithResponse(response);
      toast.success(response.message || "Account created successfully.");
      navigate("/app", { replace: true });
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Đăng ký thất bại.");
    }
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
      <LeftPanel />
      <div className="flex-1 h-full flex items-center justify-center p-8 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-[400px]">
          <Link to="/login" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-5">
            <ArrowLeft size={14} /> Back to Login
          </Link>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h2>
            <p className="text-sm text-gray-500">Join TaskGenie as a project leader</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <FormField label="Full Name" error={errors.name?.message}>
              <AuthInput type="text" placeholder="Huy Pham" hasError={!!errors.name} icon={<User size={15} />} {...register("name")} />
            </FormField>
            <FormField label="Email address" error={errors.email?.message}>
              <AuthInput type="email" placeholder="you@company.com" hasError={!!errors.email} icon={<Mail size={15} />} {...register("email")} />
            </FormField>
            <FormField label="Password" error={errors.password?.message}>
              <AuthInput
                type={showPw ? "text" : "password"}
                placeholder="Min. 8 characters"
                hasError={!!errors.password}
                icon={<Lock size={15} />}
                suffix={
                  <button type="button" onClick={() => setShowPw(!showPw)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
                {...register("password")}
              />
              <PasswordStrengthBar password={watch("password") ?? ""} />
            </FormField>
            <FormField label="Confirm Password" error={errors.confirm?.message}>
              <AuthInput
                type={showCp ? "text" : "password"}
                placeholder="Re-enter password"
                hasError={!!errors.confirm}
                icon={<Lock size={15} />}
                suffix={
                  <button type="button" onClick={() => setShowCp(!showCp)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                    {showCp ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
                {...register("confirm")}
              />
            </FormField>
            {apiError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={14} /> {apiError}
              </div>
            )}
            <div className="pt-1">
              <AuthButton type="submit" loading={isSubmitting}>
                Create Account
              </AuthButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
