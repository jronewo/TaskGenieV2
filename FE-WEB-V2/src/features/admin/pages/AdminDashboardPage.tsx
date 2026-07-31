import React from "react";
import { motion } from "motion/react";
import { Briefcase, Building2, CheckCircle2, Loader2, ShieldAlert, Users } from "lucide-react";
import { usePlatformStats } from "../hooks/useAdmin";

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = usePlatformStats();

  const tiles = stats
    ? [
        { label: "Users", value: stats.users, icon: Users },
        { label: "Organizations", value: stats.organizations, icon: Building2 },
        { label: "Projects", value: stats.projects, icon: Briefcase },
        { label: "Tasks", value: stats.tasks, icon: ShieldAlert },
        { label: "Tasks Done", value: stats.tasksDone, icon: CheckCircle2 },
      ]
    : [];

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="mb-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
          <ShieldAlert size={12} /> Admin
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Platform statistics</h2>
        <p className="mt-1 text-sm text-slate-500">Platform-wide totals across all users, organizations, and projects.</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={16} /> Loading stats...
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <t.icon size={18} className="mb-2 text-slate-400" />
            <div className="text-2xl font-bold text-slate-900">{t.value}</div>
            <div className="text-xs text-slate-500">{t.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
