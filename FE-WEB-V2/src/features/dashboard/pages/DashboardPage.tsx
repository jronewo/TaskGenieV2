import React from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Layers, CheckCircle, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "../../../core/auth/AuthContext";
import { useProjects } from "../../projects/hooks/useProjects";
import { useMyTasks } from "../../tasks/hooks/useTasks";
import { useUnreadCount } from "../../notifications/hooks/useNotifications";

const riskBadge = (riskLevel: string) => {
  if (riskLevel === "CRITICAL") return { label: "Critical", cls: "bg-red-100 text-red-700 border-red-200" };
  if (riskLevel === "HIGH") return { label: "High Risk", cls: "bg-amber-100 text-amber-700 border-amber-200" };
  if (riskLevel === "MEDIUM") return { label: "At Risk", cls: "bg-gray-100 text-gray-600 border-gray-200" };
  return { label: "On Track", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: projects, isLoading: loadingProjects } = useProjects();
  const { data: myTasks, isLoading: loadingTasks } = useMyTasks();
  const { data: unread } = useUnreadCount();

  const total = myTasks?.length ?? 0;
  const done = myTasks?.filter((t) => t.status === "Done").length ?? 0;
  const inProgress = myTasks?.filter((t) => t.status === "InProgress").length ?? 0;
  const critical = myTasks?.filter((t) => t.riskLevel === "CRITICAL").length ?? 0;
  const completion = total > 0 ? Math.round((done / total) * 100) : 0;

  const stats = [
    { label: "My Tasks", value: total, sub: `${done} done`, icon: Layers, alert: false },
    { label: "Completion", value: `${completion}%`, sub: `${done}/${total}`, icon: CheckCircle, alert: false },
    { label: "In Progress", value: inProgress, sub: "active", icon: TrendingUp, alert: false },
    { label: "Critical", value: critical, sub: "need attention", icon: AlertTriangle, alert: critical > 0 },
    { label: "Notifications", value: unread?.count ?? 0, sub: "unread", icon: AlertTriangle, alert: (unread?.count ?? 0) > 0 },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-white overflow-x-auto">
        {stats.map((s) => (
          <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-md border shrink-0 ${s.alert ? "border-red-200 bg-red-50" : "border-gray-100 bg-white"}`}>
            <s.icon size={13} className={s.alert ? "text-red-500" : "text-gray-400"} />
            <div>
              <span className={`text-xs font-bold ${s.alert ? "text-red-700" : "text-gray-900"}`}>{s.value}</span>
              <span className="text-[10px] text-gray-400 ml-1">{s.sub}</span>
            </div>
            <span className="text-[10px] text-gray-400 border-l border-gray-100 pl-2">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Welcome back, {user?.name ?? user?.email}</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">{projects?.length ?? 0} projects · click a project to open it</p>
          </div>
        </div>

        {(loadingProjects || loadingTasks) && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
            <Loader2 className="animate-spin" size={16} /> Loading dashboard...
          </div>
        )}

        {!loadingProjects && (projects ?? []).length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
            No projects yet.{" "}
            <button className="text-[#1A237E] font-semibold" onClick={() => navigate("/app/projects")}>
              Create your first project
            </button>
            .
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {(projects ?? []).map((project, i) => {
            const badge = riskBadge(project.riskLevel);
            return (
              <motion.button
                key={project.projectId}
                className="rounded-lg border border-gray-100 bg-white p-3.5 text-left hover:border-gray-300 transition-all"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/app/projects/${project.projectId}`)}
                whileHover={{ y: -1 }}
              >
                <div className="flex items-center justify-between w-full gap-2 mb-2">
                  <span className="text-xs font-black text-gray-900 uppercase tracking-wide truncate min-w-0">{project.name}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${badge.cls}`}>{badge.label}</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono mb-2">{project.teamName ?? "No team"}</div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] text-gray-400 font-medium">Progress</span>
                  <span className="text-[10px] font-bold text-gray-700 font-mono">{project.progress}%</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gray-700" style={{ width: `${project.progress}%` }} />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
