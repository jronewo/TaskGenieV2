import React, { useMemo } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Layers, CheckCircle, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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

const RISK_COLORS: Record<string, string> = {
  LOW: "#10B981",
  MEDIUM: "#9CA3AF",
  HIGH: "#F59E0B",
  CRITICAL: "#EF4444",
};

const STATUS_COLORS: Record<string, string> = {
  Todo: "#1E88E5",
  InProgress: "#7C4DFF",
  Done: "#10B981",
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

  const riskChartData = useMemo(() => {
    const counts: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    (projects ?? []).forEach((p) => {
      const key = p.riskLevel in counts ? p.riskLevel : "MEDIUM";
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [projects]);

  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = { Todo: 0, InProgress: 0, Done: 0 };
    (myTasks ?? []).forEach((t) => {
      if (t.status && t.status in counts) counts[t.status] += 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [myTasks]);

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

        {!loadingProjects && !loadingTasks && (projects ?? []).length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 mb-3">
            <div className="rounded-lg border border-gray-100 bg-white p-3.5">
              <h3 className="text-xs font-semibold text-gray-700 mb-0.5">Project Risk Distribution</h3>
              <p className="text-[10px] text-gray-400 mb-2">{projects?.length ?? 0} projects by risk level</p>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={riskChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={32} outerRadius={56} strokeWidth={1} stroke="white">
                    {riskChartData.map((entry) => (
                      <Cell key={entry.name} fill={RISK_COLORS[entry.name] ?? "#9CA3AF"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
                {riskChartData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: RISK_COLORS[d.name] }} />
                    <span className="text-[10px] text-gray-500">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3.5">
              <h3 className="text-xs font-semibold text-gray-700 mb-0.5">My Tasks by Status</h3>
              <p className="text-[10px] text-gray-400 mb-2">{total} tasks assigned to you</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={statusChartData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} width={22} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 11 }} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusChartData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#9CA3AF"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
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
