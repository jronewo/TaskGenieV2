import { useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { LeftPanel } from "../components/AuthPrimitives";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { authApi } from "../api/authApi";
import { useAuth } from "../../../core/auth/AuthContext";
import { ApiError } from "../../../core/api/client";

export default function LoginPage() {
  const { loginWithResponse } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");

  const handleGoogleCredential = async (idToken: string) => {
    setApiError("");
    try {
      const response = await authApi.google({ idToken });
      loginWithResponse(response);
      toast.success(response.message || `Welcome back, ${response.name ?? response.email}!`);
      navigate("/app", { replace: true });
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Đăng nhập Google thất bại.");
    }
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
      <LeftPanel />
      <div className="flex-1 h-full flex items-center justify-center p-8 bg-gray-50 overflow-y-auto relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(26,35,126,0.08) 1px, transparent 1.4px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="w-full max-w-[300px] flex flex-col items-center text-center relative z-10">
          <div className="relative w-[52px] h-[52px] rounded-full bg-[#eef0fb] flex items-center justify-center mb-5">
            <div className="absolute -inset-2 rounded-full border border-[#1A237E]/10" />
            <Sparkles size={22} className="text-[#1A237E]" />
          </div>

          <h2 className="text-[19px] font-bold text-gray-900 mb-1.5">Welcome to TaskGenie</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Đăng nhập bằng tài khoản Google công việc của bạn để tiếp tục
          </p>

          {apiError && (
            <div className="w-full flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={14} className="shrink-0" /> {apiError}
            </div>
          )}

          <GoogleSignInButton onCredential={handleGoogleCredential} width={280} />

          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-4">
            <Lock size={12} /> Chúng tôi chỉ dùng email để xác thực danh tính, không lưu mật khẩu
          </div>

          <p className="text-[10.5px] text-gray-400 mt-6 leading-relaxed max-w-[230px]">
            Bằng việc tiếp tục, bạn đồng ý với{" "}
            <a href="#" className="text-gray-500 font-semibold underline underline-offset-2">
              Điều khoản
            </a>{" "}
            và{" "}
            <a href="#" className="text-gray-500 font-semibold underline underline-offset-2">
              Chính sách bảo mật
            </a>{" "}
            của TaskGenie.
          </p>
        </div>
      </div>
    </div>
  );
}
