import React from "react";
import { motion } from "motion/react";
import { Clock, AlertTriangle, CheckCircle, Flame, Zap, Link2 } from "lucide-react";
import { TaskDetailDto } from "../types";
import { daysUntil } from "../../../core/utils/date";

const riskConfig: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ReactNode }> = {
  LOW: { color: "#10B981", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.3)", label: "Low Risk", icon: <CheckCircle size={11} /> },
  MEDIUM: { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.3)", label: "At Risk", icon: <AlertTriangle size={11} /> },
  HIGH: { color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.3)", label: "High Risk", icon: <Flame size={11} /> },
  CRITICAL: { color: "#DC2626", bg: "rgba(220, 38, 38, 0.12)", border: "rgba(220, 38, 38, 0.5)", label: "Critical", icon: <Zap size={11} /> },
};

const fallbackRisk = { color: "#94A3B8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)", label: "Unknown", icon: <CheckCircle size={11} /> };

interface TaskCardProps {
  task: TaskDetailDto;
  onClick: (task: TaskDetailDto) => void;
  index: number;
}

export const TaskCard = ({ task, onClick, index }: TaskCardProps) => {
  const risk = (task.riskLevel && riskConfig[task.riskLevel]) || fallbackRisk;
  const days = daysUntil(task.deadline);
  const isCritical = task.riskLevel === "CRITICAL";
  const isOverdue = days !== null && days < 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="bg-white rounded-[12px] p-3.5 cursor-pointer group relative overflow-hidden"
      style={{
        boxShadow: isCritical ? "0 2px 12px rgba(220, 38, 38, 0.15), 0 1px 3px rgba(0,0,0,0.06)" : "0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        border: `1px solid ${isCritical ? "rgba(220, 38, 38, 0.2)" : "rgba(0,0,0,0.06)"}`,
      }}
      onClick={() => onClick(task)}
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {task.priority && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 capitalize">{task.priority}</span>
          )}
          {task.dependencies.length > 0 && (
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
              <Link2 size={10} /> {task.dependencies.length}
            </span>
          )}
        </div>
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0 text-[10px] font-semibold"
          style={{ color: risk.color, backgroundColor: risk.bg, border: `1px solid ${risk.border}` }}
        >
          {risk.icon}
          {risk.label}
        </div>
      </div>

      <h3 className="text-sm font-semibold text-gray-800 mb-1.5 leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
        {task.title}
      </h3>

      {task.status === "InProgress" && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400">Progress</span>
            <span className="text-[10px] font-semibold text-gray-600">{task.progress ?? 0}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gray-700"
              initial={{ width: 0 }}
              animate={{ width: `${task.progress ?? 0}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          </div>
        </div>
      )}

      {task.aiSummary && (
        <div className="mb-2.5 px-2.5 py-2 rounded-xl flex items-start gap-2 bg-gray-50">
          <p className="text-[10px] text-gray-600 leading-relaxed line-clamp-2">{task.aiSummary}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.assignees.length === 0 && <span className="text-[10px] text-gray-400">Unassigned</span>}
          {task.assignees.slice(0, 3).map((a) => (
            <span key={a.userId} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">
              {a.userName}
            </span>
          ))}
        </div>

        {days !== null && (
          <div className={`flex items-center gap-1 shrink-0 ${isOverdue ? "text-red-500" : days <= 2 ? "text-orange-500" : "text-gray-400"}`}>
            <Clock size={11} />
            <span className="text-[10px] font-medium">{isOverdue ? `${Math.abs(days)}d late` : days === 0 ? "Today" : `${days}d`}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
