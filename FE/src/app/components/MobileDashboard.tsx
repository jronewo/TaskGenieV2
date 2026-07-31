import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, BarChart2, Bell, Plus, Sparkles,
  ChevronRight, Flame, AlertTriangle, CheckCircle, Clock,
  TrendingUp, Users, Target, Zap, ArrowRight, Filter
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from "recharts";
import { tasks, projects, teamMembers } from "../data/tmaiData";

const CircularHealthChart = () => {
  const safe = tasks.filter(t => t.risk === "safe").length;
  const medium = tasks.filter(t => t.risk === "medium").length;
  const high = tasks.filter(t => t.risk === "high").length;
  const critical = tasks.filter(t => t.risk === "critical").length;

  const data = [
    { name: "Safe", value: safe, color: "#10B981" },
    { name: "At Risk", value: medium, color: "#F59E0B" },
    { name: "High Risk", value: high, color: "#EF4444" },
    { name: "Critical", value: critical, color: "#DC2626" },
  ];

  const total = tasks.length;
  const healthScore = Math.round(((safe * 100 + medium * 60 + high * 30 + critical * 0) / total) / 100 * 100);

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900">Project Health</h3>
          <p className="text-xs text-gray-500">AI Risk Analysis</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: "linear-gradient(135deg, rgba(124,77,255,0.1), rgba(30,136,229,0.1))" }}>
          <Sparkles size={12} className="text-purple-600" />
          <span className="text-xs font-semibold text-purple-700">AI Powered</span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative w-32 h-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={58}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">{healthScore}</span>
            <span className="text-[10px] text-gray-500 font-medium">Health</span>
          </div>
        </div>

        <div className="flex-1 space-y-2.5">
          {data.map(d => (
            <div key={d.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="text-xs text-gray-600 flex-1">{d.name}</span>
              <span className="text-xs font-bold text-gray-800">{d.value}</span>
              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: d.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(d.value / total) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const QuickStats = () => {
  const stats = [
    { label: "Active", value: tasks.filter(t => t.status === "in_progress").length, icon: Zap, color: "#7C4DFF" },
    { label: "Done", value: tasks.filter(t => t.status === "done").length, icon: CheckCircle, color: "#10B981" },
    { label: "At Risk", value: tasks.filter(t => t.risk !== "safe").length, icon: AlertTriangle, color: "#F59E0B" },
    { label: "Critical", value: tasks.filter(t => t.risk === "critical").length, icon: Flame, color: "#EF4444" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          className="bg-white rounded-2xl p-3 text-center border border-gray-100 shadow-sm"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1.5"
            style={{ background: `${stat.color}15` }}>
            <stat.icon size={16} style={{ color: stat.color }} />
          </div>
          <div className="text-lg font-bold text-gray-900">{stat.value}</div>
          <div className="text-[10px] text-gray-500">{stat.label}</div>
        </motion.div>
      ))}
    </div>
  );
};

const ActiveTasksList = ({ onTaskPress }: { onTaskPress: () => void }) => {
  const activeTasks = tasks.filter(t => t.status === "in_progress" || t.risk === "critical");

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <h3 className="font-bold text-gray-900">Active Tasks</h3>
          <p className="text-xs text-gray-500">{activeTasks.length} tasks need attention</p>
        </div>
        <button className="text-xs text-blue-600 font-semibold flex items-center gap-1">
          View all <ChevronRight size={12} />
        </button>
      </div>
      <div className="divide-y divide-gray-50">
        {activeTasks.slice(0, 4).map((task, i) => {
          const riskColors = { safe: "#10B981", medium: "#F59E0B", high: "#EF4444", critical: "#DC2626" };
          const days = Math.ceil((new Date(task.deadline).getTime() - new Date("2026-05-10").getTime()) / (1000 * 60 * 60 * 24));

          return (
            <motion.div
              key={task.id}
              className="flex items-center gap-3 px-4 py-3 active:bg-gray-50"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              onTap={onTaskPress}
            >
              <div className="w-1 h-10 rounded-full shrink-0" style={{ background: riskColors[task.risk] }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <img src={task.assignee.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                  <span className="text-[10px] text-gray-500">{task.assignee.name.split(" ")[0]}</span>
                  <span className="text-[10px] text-gray-300">·</span>
                  <Clock size={10} className={days <= 2 ? "text-red-400" : "text-gray-400"} />
                  <span className={`text-[10px] ${days <= 2 ? "text-red-500 font-semibold" : "text-gray-500"}`}>
                    {days <= 0 ? "Overdue" : `${days}d`}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: riskColors[task.risk], background: `${riskColors[task.risk]}15` }}
                >
                  {task.risk === "critical" ? "Critical" : task.risk === "high" ? "High" : task.risk === "medium" ? "Risk" : "Safe"}
                </span>
                {task.status === "in_progress" && (
                  <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${task.progress}%`,
                        background: "linear-gradient(90deg, #7C4DFF, #1E88E5)"
                      }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const AIInsightCard = () => {
  const criticalTask = tasks.find(t => t.risk === "critical");

  return (
    <motion.div
      className="rounded-3xl p-4 overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, #1A237E 0%, #4527A0 100%)" }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #7C4DFF, transparent)", transform: "translate(30%, -30%)" }} />

      <div className="flex items-start gap-3 relative z-10">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.15)" }}>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <Sparkles size={20} className="text-purple-200" />
          </motion.div>
        </div>
        <div className="flex-1">
          <div className="text-purple-200 text-[10px] font-semibold uppercase tracking-wider mb-1">AI Alert</div>
          <p className="text-white text-sm font-semibold mb-1 leading-snug">
            {criticalTask ? `"${criticalTask.title}" needs immediate attention` : "All tasks are on track"}
          </p>
          <p className="text-purple-300 text-xs leading-relaxed">
            {criticalTask?.aiInsight || "No critical issues detected at this time."}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10 relative z-10">
        <span className="text-purple-300 text-xs">View full analysis</span>
        <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
          <ArrowRight size={12} className="text-white" />
        </div>
      </div>
    </motion.div>
  );
};

const ProjectsOverview = () => (
  <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <h3 className="font-bold text-gray-900">Projects</h3>
      <button className="text-xs text-blue-600 font-semibold flex items-center gap-1">
        All <ChevronRight size={12} />
      </button>
    </div>
    <div className="divide-y divide-gray-50">
      {projects.slice(0, 3).map((project, i) => {
        const riskColor = project.riskScore < 30 ? "#10B981" : project.riskScore < 60 ? "#F59E0B" : "#EF4444";
        return (
          <motion.div
            key={project.id}
            className="flex items-center gap-3 px-4 py-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ background: `${project.color}15` }}>
              {project.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{project.name}</p>
              <p className="text-xs text-gray-500">{project.taskCount} tasks</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: riskColor }} />
                <span className="text-[10px] text-gray-500">{project.riskScore}% risk</span>
              </div>
              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${project.riskScore}%`, background: riskColor }} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  </div>
);

type MobileTab = "board" | "reports" | "notifications";

export const MobileDashboard = ({ onTaskPress }: { onTaskPress: () => void }) => {
  const [activeTab, setActiveTab] = useState<MobileTab>("board");

  const navItems = [
    { id: "board" as MobileTab, label: "Board", icon: LayoutDashboard },
    { id: "reports" as MobileTab, label: "Reports", icon: BarChart2 },
    { id: "notifications" as MobileTab, label: "Alerts", icon: Bell, badge: 3 },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Mobile Header */}
      <div
        className="px-4 pt-10 pb-4"
        style={{ background: "linear-gradient(135deg, #1A237E 0%, #283593 100%)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-white/70 text-xs font-medium mb-0.5">Good morning,</div>
            <div className="text-white font-bold text-xl">Huy Pham 👋</div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center relative"
              whileTap={{ scale: 0.9 }}
            >
              <Bell size={18} className="text-white" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full ring-1 ring-blue-900" />
            </motion.button>
            <img
              src="https://images.unsplash.com/photo-1601513043334-36a0088140d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=100"
              alt="User"
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-white/30"
            />
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-4 py-2.5 border border-white/10">
          <Target size={16} className="text-blue-200" />
          <span className="text-blue-200 text-sm">Search tasks, projects...</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === "board" && (
            <motion.div
              key="board"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-4 pb-24"
            >
              <QuickStats />
              <AIInsightCard />
              <CircularHealthChart />
              <ActiveTasksList onTaskPress={onTaskPress} />
              <ProjectsOverview />
            </motion.div>
          )}

          {activeTab === "reports" && (
            <motion.div
              key="reports"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-4 pb-24"
            >
              <CircularHealthChart />
              <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Sprint Progress</h3>
                {["Frontend", "Backend API", "AI Engine"].map((sprint, i) => {
                  const progress = [75, 48, 65][i];
                  const color = ["#1E88E5", "#7C4DFF", "#10B981"][i];
                  return (
                    <div key={sprint} className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 font-medium">{sprint}</span>
                        <span className="font-bold text-gray-800">{progress}%</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Velocity", value: "84 pts", icon: TrendingUp, color: "#7C4DFF" },
                  { label: "Team Size", value: "4 devs", icon: Users, color: "#1E88E5" },
                ].map(item => (
                  <div key={item.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                      style={{ background: `${item.color}15` }}>
                      <item.icon size={20} style={{ color: item.color }} />
                    </div>
                    <div className="text-xl font-bold text-gray-900">{item.value}</div>
                    <div className="text-xs text-gray-500">{item.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "notifications" && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-3 pb-24"
            >
              <h3 className="font-bold text-gray-900">Notifications</h3>
              {[
                { type: "critical", icon: "🔥", title: "Critical: Risk Engine", body: "Deadline in 2 days. Model accuracy at 78%", time: "2m ago", color: "#EF4444" },
                { type: "ai", icon: "🤖", title: "AI Alert: API Integration", body: "3 blockers detected. Suggest reassignment", time: "15m ago", color: "#7C4DFF" },
                { type: "team", icon: "👤", title: "New Assignment", body: "You were added to Analytics Dashboard", time: "1h ago", color: "#1E88E5" },
                { type: "done", icon: "✅", title: "Task Completed", body: "Notification Service passed review", time: "3h ago", color: "#10B981" },
                { type: "comment", icon: "💬", title: "New Comment", body: "An Le: Need to fix accuracy on edge cases", time: "5h ago", color: "#F59E0B" },
              ].map((notif, i) => (
                <motion.div
                  key={i}
                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-start gap-3"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: `${notif.color}15` }}>
                    {notif.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800 truncate">{notif.title}</p>
                      <span className="text-[10px] text-gray-400 shrink-0">{notif.time}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.body}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around px-4 py-3"
        style={{ boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}
      >
        {navItems.map(({ id, label, icon: Icon, badge }) => (
          <motion.button
            key={id}
            className="flex flex-col items-center gap-1 relative px-4"
            onClick={() => setActiveTab(id)}
            whileTap={{ scale: 0.9 }}
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
              activeTab === id
                ? "text-white"
                : "text-gray-400"
            }`}
              style={activeTab === id ? { background: "linear-gradient(135deg, #1A237E, #4527A0)" } : {}}>
              <Icon size={20} />
              {badge && (
                <span className="absolute top-0 right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-semibold ${activeTab === id ? "text-blue-900" : "text-gray-400"}`}>
              {label}
            </span>
          </motion.button>
        ))}

        {/* FAB */}
        <motion.button
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, #7C4DFF, #1E88E5)" }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >
          <Plus size={24} />
        </motion.button>
      </div>
    </div>
  );
};
