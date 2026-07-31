import React from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Sparkles, ShieldCheck, Zap, Users, KanbanSquare, LineChart, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "AI Risk Prediction",
    description: "Tự động chấm điểm rủi ro cho từng task dựa trên tiến độ, deadline và độ khó — cảnh báo sớm trước khi trễ hạn.",
  },
  {
    icon: Users,
    title: "AI Task Assignment",
    description: "Gợi ý người phù hợp nhất cho từng task theo kỹ năng, mức độ tương đồng công việc, khối lượng việc hiện tại và hiệu suất trước đó.",
  },
  {
    icon: KanbanSquare,
    title: "Kanban Board",
    description: "Quản lý task theo trạng thái, kéo-thả trực quan, theo dõi tiến độ và dependency giữa các task trong cùng dự án.",
  },
  {
    icon: LineChart,
    title: "Team Evaluation & Scoring",
    description: "Đánh giá hiệu suất thành viên và chấm điểm thưởng/phạt khi đóng dự án, dựa trên dữ liệu thực tế của từng task.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "#1A237E" }}>
              <Sparkles size={16} className="text-blue-200" />
            </div>
            <span className="font-bold text-lg tracking-wide">TaskGenie</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-2">
              Đăng nhập
            </Link>
            <Link to="/register" className="text-sm font-semibold text-white px-4 py-2 rounded-lg" style={{ background: "#1A237E" }}>
              Bắt đầu miễn phí
            </Link>
          </nav>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-5">
            <ShieldCheck size={12} /> Đồ án Capstone — Quản lý dự án với AI
          </span>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5">
            Quản lý dự án &amp; task thông minh hơn với AI
          </h1>
          <p className="text-base text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
            TaskGenie giúp đội nhóm theo dõi tiến độ, phát hiện rủi ro sớm và phân bổ công việc hợp lý — dựa trên dữ liệu thực
            tế thay vì phỏng đoán.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-lg hover:bg-[#0D1757] transition-colors"
              style={{ background: "#1A237E" }}
            >
              Bắt đầu miễn phí <ArrowRight size={15} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 px-5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Tôi đã có tài khoản
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid gap-4 md:grid-cols-2">
          {features.map(({ icon: Icon, title, description }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white border border-gray-200 rounded-2xl p-5 flex gap-4"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(26,35,126,0.08)" }}>
                <Icon size={20} style={{ color: "#1A237E" }} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} TaskGenie · Capstone Project
        </div>
      </footer>
    </div>
  );
}
