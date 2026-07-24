import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { MobileDashboard } from "./components/MobileDashboard";
import { ReportsDashboard } from "./components/ReportsDashboard";
import { ProjectDetailSheet } from "./components/ProjectDetailSheet";
import { AuthModule } from "./components/AuthModule";
import { TeamManagement } from "./components/TeamManagement";
import { EvaluationCenter } from "./components/EvaluationCenter";
import { AdministrationCenter } from "./components/AdministrationCenter";
import { ProjectManagement } from "./components/ProjectManagement";
import { KanbanBoard } from "./components/KanbanBoard";
import { TaskDetailModal } from "./components/TaskDetailModal";
import { CoreAiDemoPanel } from "./components/CoreAiDemoPanel";
import { CreateTaskModal } from "./components/CreateTaskModal";
import { Project, projects, tasks } from "./data/tmaiData";
import { useAuth } from "./context/AuthContext";
import { projectsApi } from "./services/projectsApi";
import { tasksApi, TaskDto } from "./services/tasksApi";
import { ApiError } from "./services/apiClient";
import {
  AlertTriangle, CheckCircle, TrendingUp, Layers, ChevronRight, LogOut
} from "lucide-react";
import { Toaster, toast } from "sonner";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

const getRiskBadge = (score: number) => {
  if (score >= 80) return { label: "Critical", cls: "bg-red-100 text-red-700 border border-red-200" };
  if (score >= 60) return { label: "High Risk", cls: "bg-amber-100 text-amber-700 border border-amber-200" };
  if (score >= 35) return { label: "At Risk", cls: "bg-gray-100 text-gray-600 border border-gray-200" };
  return { label: "On Track", cls: "bg-gray-100 text-gray-600 border border-gray-200" };
};

const getProgress = (project: Project) =>
  Math.round(Math.max(10, 92 - project.riskScore * 0.68));

const DashboardSummaryBar = () => {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const critical = tasks.filter((t) => t.risk === "critical").length;
  const inProg = tasks.filter((t) => t.status === "in_progress").length;
  const completion = Math.round((done / total) * 100);

  const stats = [
    { label: "Total Tasks", value: total, sub: `${done} done`, icon: Layers, alert: false },
    { label: "Completion", value: `${completion}%`, sub: `${done}/${total}`, icon: CheckCircle, alert: false },
    { label: "In Progress", value: inProg, sub: "active", icon: TrendingUp, alert: false },
    { label: "Critical", value: critical, sub: "need attention", icon: AlertTriangle, alert: critical > 0 },
    { label: "Projects", value: projects.length, sub: "tracked", icon: Layers, alert: false },
  ];

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-white overflow-x-auto">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md border shrink-0 ${
            s.alert ? "border-red-200 bg-red-50" : "border-gray-100 bg-white"
          }`}
        >
          <s.icon size={13} className={s.alert ? "text-red-500" : "text-gray-400"} />
          <div>
            <span className={`text-xs font-bold ${s.alert ? "text-red-700" : "text-gray-900"}`}>
              {s.value}
            </span>
            <span className="text-[10px] text-gray-400 ml-1">{s.sub}</span>
          </div>
          <span className="text-[10px] text-gray-400 border-l border-gray-100 pl-2">{s.label}</span>
        </div>
      ))}
    </div>
  );
};

const ProjectGrid = ({
  onSelect,
}: {
  onSelect: (p: Project) => void;
}) => {
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  const getProjectTasks = (project: Project) => {
    const searchTerms = [project.name, ...(project.children?.map((child) => child.name) ?? [])].map((term) => term.toLowerCase());

    return tasks.filter((task) => {
      const taskText = [task.title, task.description, ...task.tags].join(" ").toLowerCase();
      return searchTerms.some((term) => taskText.includes(term));
    });
  };

  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Projects Overview</h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {projects.length} active · Click a project to expand a quick snapshot
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {projects.map((project, i) => {
          const progress = getProgress(project);
          const badge = getRiskBadge(project.riskScore);
          const isHighRisk = project.riskScore >= 60;
          const isExpanded = expandedProjectId === project.id;
          const projectTasks = getProjectTasks(project);
          const previewTasks = projectTasks.slice(0, 3);
          const highRiskTasks = projectTasks.filter((task) => task.risk === "high" || task.risk === "critical").length;
          const ownerNames = Array.from(new Set(projectTasks.map((task) => task.assignee.name))).slice(0, 2).join(", ");

          return (
            <div key={project.id} className={`rounded-lg border bg-white p-3.5 transition-all ${isHighRisk ? "border-gray-200" : "border-gray-100"}`}>
              <motion.button
                className="text-left w-full flex flex-col justify-between gap-2 group"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => {
                  setExpandedProjectId((prev) => (prev === project.id ? null : project.id));
                  onSelect(project);
                }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="text-xs font-black text-gray-900 uppercase tracking-wide truncate min-w-0">
                    {project.name}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <ChevronRight size={12} className={`text-gray-300 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    {projectTasks.length} active tasks · Risk Score: {project.riskScore}
                  </div>
                  {project.children && project.children.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {project.children.map((child) => (
                        <span
                          key={child.id}
                          className="text-[9px] bg-gray-50 text-gray-600 border border-gray-100 px-1 py-0.5 rounded font-medium"
                        >
                          {child.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-full">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-gray-400 font-medium">Progress</span>
                    <span className="text-[10px] font-bold text-gray-700 font-mono">{progress}%</span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        project.riskScore >= 80 ? "bg-red-500" : project.riskScore >= 60 ? "bg-amber-500" : "bg-gray-700"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.55, delay: 0.08 + i * 0.04 }}
                    />
                  </div>
                </div>
              </motion.button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 overflow-hidden rounded-md border border-gray-100 bg-gray-50/70 p-2.5"
                  >
                    <div className="mb-2 grid grid-cols-2 gap-2 text-[10px] text-gray-600">
                      <div className="rounded bg-white px-2 py-1.5 border border-gray-100">
                        <div className="text-[9px] uppercase tracking-wide text-gray-400">Overall</div>
                        <div className="font-semibold text-gray-900">{progress}% complete</div>
                      </div>
                      <div className="rounded bg-white px-2 py-1.5 border border-gray-100">
                        <div className="text-[9px] uppercase tracking-wide text-gray-400">Risk</div>
                        <div className="font-semibold text-gray-900">{highRiskTasks} high-risk tasks</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {previewTasks.map((task) => (
                        <div key={task.id} className="rounded border border-gray-100 bg-white px-2.5 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-[10px] font-semibold text-gray-800">{task.title}</p>
                              <p className="mt-0.5 text-[9px] text-gray-500">{task.assignee.name}</p>
                            </div>
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${task.risk === "critical" ? "bg-red-100 text-red-700" : task.risk === "high" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                              {task.risk}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-gray-700" style={{ width: `${task.progress}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {ownerNames && (
                      <div className="mt-2 text-[10px] text-gray-500">
                        <span className="font-semibold text-gray-700">Owners:</span> {ownerNames}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="mt-5 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-3xs">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/70">
          <span className="text-xs font-black text-[#000000] tracking-wider uppercase">
            Risk Summary Matrix
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/40">
                <th className="px-4 py-2.5 font-black text-[#000000] uppercase tracking-wider w-1/3">PROJECT NAME</th>
                <th className="px-4 py-2.5 font-black text-[#000000] uppercase tracking-wider text-center w-1/6">TASKS COUNT</th>
                <th className="px-4 py-2.5 font-black text-[#000000] uppercase tracking-wider w-1/3">COMPLETION PROGRESS</th>
                <th className="px-4 py-2.5 font-black text-[#000000] uppercase tracking-wider text-center w-1/6">RISK LEVEL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projects.map((project) => {
                const badge = getRiskBadge(project.riskScore);
                const progress = getProgress(project);
                return (
                  <tr 
                    key={project.id}
                    onClick={() => onSelect(project)}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-bold text-gray-900 uppercase tracking-wide">
                      {project.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-bold font-mono text-center">
                      {project.taskCount} tasks
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                          <div
                            className={`h-full rounded-full ${
                              project.riskScore >= 80 ? "bg-red-500" : project.riskScore >= 60 ? "bg-amber-500" : "bg-gray-700"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-gray-700 font-mono w-8 shrink-0 text-right">
                          {progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded inline-block w-20 font-mono ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const TeamView = () => {
  return <TeamManagement />;
};

const ProjectView = ({
  activeProject,
  setActiveProject,
}: {
  activeProject: string;
  setActiveProject: (id: string) => void;
}) => {
  return <ProjectManagement selectedProjectId={activeProject} onProjectSelect={(projectId) => setActiveProject(projectId)} />;
};

const NotificationsView = () => (
  <div className="p-4 space-y-2 max-w-xl">
    <div>
      <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
      <p className="text-[10px] text-gray-500 mt-0.5">5 unread</p>
    </div>
    {[
      { title: "Critical Risk Detected", body: "Risk Prediction Engine: model accuracy 78% vs target 90%. Deadline in 2 days.", time: "2 min ago", urgent: true },
      { title: "Deadline Conflict Alert", body: "API Integration has 3 blockers. Suggest reassigning 1 task to An Le.", time: "15 min ago", urgent: true },
      { title: "New Comment", body: "An Le commented on Performance Benchmarking.", time: "1 hour ago", urgent: false },
      { title: "Task Completed", body: "Design System Foundations marked complete by Minh Tran.", time: "3 hours ago", urgent: false },
      { title: "Assignment Update", body: "You were assigned to Database Schema Design.", time: "5 hours ago", urgent: false },
      { title: "Weekly Report Ready", body: "AI-generated weekly performance report is available.", time: "1 day ago", urgent: false },
    ].map((notif, i) => (
      <motion.div
        key={i}
        className={`flex items-start gap-3 p-3 rounded-lg border ${
          notif.urgent ? "bg-red-50 border-red-100" : "bg-white border-gray-100"
        }`}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.05 }}
      >
        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${notif.urgent ? "bg-red-500" : "bg-gray-300"}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-900">{notif.title}</p>
            {notif.urgent && (
              <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded font-semibold shrink-0">
                URGENT
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{notif.body}</p>
          <p className="text-[10px] text-gray-400 mt-1">{notif.time}</p>
        </div>
      </motion.div>
    ))}
  </div>
);

const SettingsView = () => {
  const [settingsState, setSettingsState] = useState({
    "Enable AI Risk Prediction": true,
    "AI Team Suggestions": true,
    "Deadline Conflict Detection": true,
    "Critical Risk Alerts": true,
    "Weekly Reports": false,
    "Team Updates": true,
  });

  const toggleSetting = (label: string) => {
    setSettingsState((prev) => ({
      ...prev,
      [label]: !prev[label as keyof typeof prev],
    }));
  };

  const sections = [
    {
      section: "AI Engine",
      items: [
        { label: "Enable AI Risk Prediction", desc: "Automatically assess task risk levels" },
        { label: "AI Team Suggestions", desc: "Suggest optimal team members for tasks" },
        { label: "Deadline Conflict Detection", desc: "Alert when tasks have overlapping deadlines" },
      ],
    },
    {
      section: "Notifications",
      items: [
        { label: "Critical Risk Alerts", desc: "Notify for high-risk tasks immediately" },
        { label: "Weekly Reports", desc: "Send AI-generated weekly summaries" },
        { label: "Team Updates", desc: "Notify on task assignments and completions" },
      ],
    },
  ];

  return (
    <div className="p-4 max-w-md space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Settings</h2>
      </div>
      {sections.map(({ section, items }) => (
        <div key={section} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-3xs">
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{section}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {items.map((item, i) => {
              const isEnabled = settingsState[item.label as keyof typeof settingsState];

              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                    <p className="text-[10px] text-gray-500">{item.desc}</p>
                  </div>

                  <div
                    onClick={() => toggleSetting(item.label)}
                    className={`w-9 h-5 rounded-full transition-colors duration-200 pointer-events-auto cursor-pointer relative shrink-0 border ${
                      isEnabled ? "bg-[#1A237E] border-[#1A237E]" : "bg-gray-200 border-gray-300"
                    }`}
                  >
                    <motion.div
                      className="absolute top-[1px] w-4 h-4 bg-white rounded-full shadow-sm"
                      animate={{ x: isEnabled ? 17 : 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const LogoutModal = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <motion.div
      className="absolute inset-0 bg-black/25 backdrop-blur-sm"
      onClick={onCancel}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    />
    <motion.div
      className="relative bg-white border border-gray-200 rounded-xl p-6 max-w-xs w-full shadow-2xl z-10"
      initial={{ scale: 0.93, opacity: 0, y: 8 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.93, opacity: 0, y: 8 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      <div className="w-11 h-11 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center mb-4">
        <LogOut size={20} className="text-red-600" />
      </div>
      <h3 className="text-sm font-bold text-gray-900 mb-1">Sign Out</h3>
      <p className="text-xs text-gray-500 mb-5 leading-relaxed">
        Are you sure you want to sign out? Your session will be invalidated.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 text-xs font-semibold border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </motion.div>
  </div>
);

export default function App() {
  const isMobile = useIsMobile();
  const { isAuthenticated, user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [activeProject, setActiveProject] = useState("");
  const [activePage, setActivePage] = useState("dashboard");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");

  const [showAIChat, setShowAIChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  const [taskList, setTaskList] = useState<TaskDto[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const selectedTask = taskList.find((t) => t.taskId === selectedTaskId) ?? null;

  // Pick a default project on first load so the Board tab has something to show
  // before the user ever visits the Projects page.
  useEffect(() => {
    if (activeProject) return;
    projectsApi.list()
      .then((list) => { if (list.length) setActiveProject(String(list[0].projectId)); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const projectId = Number(activeProject);
    if (!activeProject || Number.isNaN(projectId)) { setTaskList([]); return; }
    setTasksLoading(true);
    tasksApi.listByProject(projectId)
      .then(setTaskList)
      .catch(() => setTaskList([]))
      .finally(() => setTasksLoading(false));
  }, [activeProject]);

  const handleCreateTask = (task: TaskDto) => {
    setTaskList((prev) => [task, ...prev]);
    toast.success(`Task "${task.title}" created.`);
  };

  const handleTaskChanged = (updated: TaskDto) => {
    setTaskList((prev) => prev.map((t) => (t.taskId === updated.taskId ? updated : t)));
  };

  const handleKanbanStatusChange = async (taskId: number, status: string) => {
    setTaskList((prev) => prev.map((t) => (t.taskId === taskId ? { ...t, status } : t)));
    try {
      await tasksApi.updateProgress(taskId, { status });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to move task.");
      const projectId = Number(activeProject);
      if (!Number.isNaN(projectId)) {
        tasksApi.listByProject(projectId).then(setTaskList).catch(() => {});
      }
    }
  };

  const openCreateTask = () => {
    setShowNewTaskModal(true);
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    toast.success("You have been signed out.");
  };

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <AuthModule />
      </>
    );
  }

  return (
    <div
      className="h-screen flex overflow-hidden bg-gray-50 relative"
      style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
    >
      <Toaster position="top-right" richColors />
      {!isMobile && (
        <>
          <motion.div
            className="h-full shrink-0 overflow-hidden"
            animate={{ width: collapsed ? 52 : 220 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            <Sidebar
              activeProject={activeProject}
              setActiveProject={setActiveProject}
              activePage={activePage}
              setActivePage={setActivePage}
              collapsed={collapsed}
              onSelectProject={setSelectedProject}
              onLogout={() => setShowLogoutModal(true)}
            />
          </motion.div>

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <Header
              collapsed={collapsed}
              toggleCollapsed={() => setCollapsed(!collapsed)}
              view={view}
              setView={setView}
              onAIToggle={() => setShowAIChat(!showAIChat)}
              onProfileToggle={() => setShowProfile(true)}
              onNewTaskToggle={() => openCreateTask(undefined)}
            />

            <div className="flex-1 flex overflow-hidden w-full relative">
              <main className="flex-1 overflow-hidden flex flex-col min-w-0">
                <AnimatePresence mode="wait">
                  {activePage === "dashboard" && (
                    <motion.div
                      key="dashboard"
                      className="flex-1 flex flex-col overflow-hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <DashboardSummaryBar />
                      <div className="flex-1 overflow-hidden">
                        <ProjectGrid
                          onSelect={(project) => {
                            setSelectedProject(project);
                            setActiveProject(project.id);
                          }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {activePage === "board" && (
                    <motion.div
                      key="board"
                      className="flex-1 overflow-hidden p-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {tasksLoading ? (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading tasks…</div>
                      ) : !activeProject ? (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                          No project selected — create one in Projects first.
                        </div>
                      ) : (
                        <KanbanBoard
                          tasks={taskList}
                          onTaskClick={(task) => setSelectedTaskId(task.taskId)}
                          onTaskStatusChange={handleKanbanStatusChange}
                          onAddTask={() => openCreateTask()}
                        />
                      )}
                    </motion.div>
                  )}

                  {activePage === "reports" && (
                    <motion.div
                      key="reports"
                      className="flex-1 overflow-hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ReportsDashboard />
                    </motion.div>
                  )}

                  {activePage === "ai-core" && (
                    <motion.div
                      key="ai-core"
                      className="flex-1 overflow-hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <CoreAiDemoPanel />
                    </motion.div>
                  )}

                  {activePage === "projects" && (
                    <motion.div
                      key="projects"
                      className="flex-1 overflow-y-auto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ProjectView activeProject={activeProject} setActiveProject={setActiveProject} />
                    </motion.div>
                  )}

                  {activePage === "team" && (
                    <motion.div
                      key="team"
                      className="flex-1 overflow-y-auto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <TeamView />
                    </motion.div>
                  )}

                  {activePage === "evaluations" && (
                    <motion.div
                      key="evaluations"
                      className="flex-1 overflow-y-auto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <EvaluationCenter />
                    </motion.div>
                  )}

                  {activePage === "administration" && (
                    <motion.div
                      key="administration"
                      className="flex-1 overflow-y-auto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <AdministrationCenter />
                    </motion.div>
                  )}

                  {activePage === "notifications" && (
                    <motion.div
                      key="notifications"
                      className="flex-1 overflow-y-auto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <NotificationsView />
                    </motion.div>
                  )}

                  {activePage === "settings" && (
                    <motion.div
                      key="settings"
                      className="flex-1 overflow-y-auto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <SettingsView />
                    </motion.div>
                  )}
                </AnimatePresence>
              </main>

              {/* IDE-STYLE RIGHT PANEL AI CONSOLE */}
              <AnimatePresence initial={false}>
                {showAIChat && (
                  <motion.div
                    className="h-full bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden"
                    initial={{ width: 0 }}
                    animate={{ width: 340 }}
                    exit={{ width: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                  >
                    <div className="w-[340px] h-full flex flex-col border-l border-gray-100">
                      <div className="p-3.5 border-b border-gray-200 bg-slate-800 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          <span className="text-xs font-black tracking-wider uppercase">TMAI Assistant Console</span>
                        </div>
                        <button onClick={() => setShowAIChat(false)} className="text-xs font-bold text-blue-200 hover:text-white font-mono">
                          [ESC]
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                        <div className="bg-gray-50 border p-2.5 rounded-lg text-gray-700 leading-relaxed">
                          Chào Leader Huy Pham. Hệ thống AI đã quét toàn bộ 4 dự án hiện tại. Phát hiện **1 rủi ro nghiêm trọng (Critical)** tại tiến độ của dự án *TMAI Platform*. Bạn cần tôi hỗ trợ phân tích ngách nào?
                        </div>
                        <div className="space-y-1.5 pt-2">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Suggested Actions</div>
                          {[
                            "Analyze Sprint 6 risk factors",
                            "Optimize An Le's task allocation",
                            "Generate weekly status summary report"
                          ].map((pText, idx) => (
                            <button key={idx} className="w-full text-left p-2 rounded bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#1A237E] font-medium transition-colors">
                              ➔ {pText}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 border-t border-gray-200 bg-gray-50/50 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Ask AI for patterns..."
                          className="flex-1 bg-white border border-gray-200 rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#1A237E] font-medium"
                        />
                        <button className="bg-slate-800 text-white font-bold text-[10px] px-3 py-1.5 rounded uppercase tracking-wider">
                          Send
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}

      {isMobile && (
        <div className="flex-1 overflow-hidden">
          <MobileDashboard onTaskPress={() => {}} />
        </div>
      )}

      {/* --- POPUP 1: PROFILE CÁ NHÂN LEADER --- */}
      <AnimatePresence>
        {showProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-xs" onClick={() => setShowProfile(false)} />
            <motion.div 
              className="relative bg-white border-2 border-[#1A237E] rounded-xl w-full max-w-md shadow-2xl overflow-hidden z-10 flex flex-col"
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
            >
              <div className="p-4 bg-[#1A237E] text-white flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider">Executive Operator Passport</span>
                <button onClick={() => setShowProfile(false)} className="text-xs font-mono opacity-70 hover:opacity-100">[X]</button>
              </div>
              <div className="p-5 flex flex-col items-center border-b border-gray-100">
                <div className="w-16 h-16 rounded-lg bg-gray-200 mb-3 overflow-hidden border border-gray-300">
                  <img src="https://images.unsplash.com/photo-1601513043334-36a0088140d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=100" alt="Huy Pham" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Nguyễn Huy Phạm</h3>
                <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md mt-1 font-mono uppercase">
                  PROJECT EXECUTIVE LEADER
                </span>
              </div>
              <div className="p-4 bg-gray-50/50 space-y-3 text-xs flex-1">
                <div className="space-y-1.5">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider">AI Management Indices</div>
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div className="bg-white border p-2 rounded">
                      <div className="text-[9px] text-gray-400">RISK MITIGATION RATE</div>
                      <div className="text-sm font-black text-green-600">88.4%</div>
                    </div>
                    <div className="bg-white border p-2 rounded">
                      <div className="text-[9px] text-gray-400">RESOURCE HEALTH IDX</div>
                      <div className="text-sm font-black text-blue-700">92.1%</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Project Authority Map</div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center bg-white p-1.5 border rounded">
                      <span className="font-bold text-gray-800">TMAI PLATFORM</span>
                      <span className="text-[9px] bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded border border-red-100">LEAD DIRECTOR</span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-1.5 border rounded">
                      <span className="font-bold text-gray-800">MOBILE APP ECOSYSTEM</span>
                      <span className="text-[9px] bg-gray-100 text-gray-600 font-bold px-1.5 py-0.5 rounded border">CORE AUDITOR</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CreateTaskModal
        open={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
        onCreate={handleCreateTask}
        projectId={activeProject ? Number(activeProject) : null}
      />

      <ProjectDetailSheet
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />

      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
        onTaskChanged={handleTaskChanged}
      />

      {/* Logout Confirmation Modal (Screen 9) */}
      <AnimatePresence>
        {showLogoutModal && (
          <LogoutModal
            onConfirm={handleLogout}
            onCancel={() => setShowLogoutModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
