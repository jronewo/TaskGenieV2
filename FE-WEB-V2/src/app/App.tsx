import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { MobileDashboard } from "./components/MobileDashboard";
import { ReportsDashboard } from "./components/ReportsDashboard";
import { AuthModule } from "./components/AuthModule";
import { TeamManagement } from "./components/TeamManagement";
import { EvaluationCenter } from "./components/EvaluationCenter";
import { AdministrationCenter } from "./components/AdministrationCenter";
import { SkillManagement } from "./components/SkillManagement";
import { ProjectManagement } from "./components/ProjectManagement";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NotificationsCenter } from "./components/NotificationsCenter";
import { ProfilePage } from "./components/ProfilePage";
import { SettingsPage } from "./components/SettingsPage";
import { AssistantChat } from "./components/AssistantChat";
import { ProjectBoardHeader } from "./components/ProjectBoardHeader";
import { TaskDetailDto } from "./services/taskApi";
import { notificationApi, NotificationDto } from "./services/notificationApi";
import { organizationApi } from "./services/organizationApi";
import { billingApi } from "./services/billingApi";
import { OrganizationCenter } from "./components/OrganizationCenter";
import { SubscriptionCenter } from "./components/SubscriptionCenter";
import { KanbanBoard } from "./components/KanbanBoard";
import { TaskDetailModal } from "./components/TaskDetailModal";
import { CreateTaskModal } from "./components/CreateTaskModal";
import { ImportTasksModal } from "./components/ImportTasksModal";
import { useWorkspace, summariseWorkspace, WorkspaceSnapshot } from "./hooks/useWorkspace";
import { DashboardCharts } from "./components/DashboardCharts";
import {
  AlertTriangle, CheckCircle, TrendingUp, Layers, ChevronRight, LogOut,
  Loader2,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { useAuth } from "./auth/AuthContext";
import { useRealtimeNotifications } from "./realtime/useRealtimeNotifications";
import { isPlatformAdmin } from "./auth/types";

const measure = () => ({
  isMobile: window.innerWidth < 768,
  /** Below this the sidebar has to give its width back to the board. */
  isNarrow: window.innerWidth < 1100,
});

const useViewport = () => {
  const [viewport, setViewport] = useState(measure);
  useEffect(() => {
    const handler = () => setViewport(measure());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return viewport;
};



const DashboardSummaryBar = ({ projects, tasks, loading }: Pick<WorkspaceSnapshot, "projects" | "tasks" | "loading">) => {
  const w = summariseWorkspace(projects, tasks);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-white text-[10px] text-gray-500">
        <Loader2 size={12} className="animate-spin" /> Loading workspace…
      </div>
    );
  }

  const stats = [
    { label: "Total Tasks", value: w.totalTasks, sub: `${w.doneTasks} done`, icon: Layers, alert: false },
    { label: "Completion", value: `${w.completionRate}%`, sub: `${w.doneTasks}/${w.totalTasks}`, icon: CheckCircle, alert: false },
    { label: "In Progress", value: w.inProgressTasks, sub: "active", icon: TrendingUp, alert: false },
    { label: "At Risk", value: w.highRiskProjects, sub: "projects", icon: AlertTriangle, alert: w.highRiskProjects > 0 },
    { label: "Projects", value: w.totalProjects, sub: "tracked", icon: Layers, alert: false },
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
  projects,
  tasks,
  loading,
  error,
}: Pick<WorkspaceSnapshot, "projects" | "tasks" | "loading" | "error"> & {
  onSelect: (projectId: number) => void;
}) => {
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 text-xs text-gray-500">
        <Loader2 size={13} className="animate-spin" /> Loading projects…
      </div>
    );
  }
  if (error) {
    return <div role="alert" className="p-4 text-xs text-red-600">{error}</div>;
  }
  if (projects.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-gray-500">
        No projects yet. Create one from the Projects page to get started.
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Projects Overview</h2>
        <p className="text-[10px] text-gray-500 mt-0.5">{projects.length} project(s) · click one to open it</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {projects.map((project, i) => {
          const projectTasks = tasks.filter((t) => t.projectId === project.projectId);
          const done = projectTasks.filter((t) => t.status === "Done").length;
          const risk = (project.riskLevel ?? "LOW").toUpperCase();
          const riskCls =
            risk === "HIGH" ? "bg-red-50 text-red-700" : risk === "MEDIUM" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700";

          return (
            <motion.button
              key={project.projectId}
              type="button"
              onClick={() => onSelect(project.projectId)}
              className="text-left rounded-lg border border-gray-200 bg-white p-3 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A237E]"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-xs font-semibold text-gray-900 leading-snug flex-1">{project.name}</p>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${riskCls}`}>{risk}</span>
              </div>
              {project.description && <p className="text-[10px] text-gray-500 line-clamp-2 mb-2">{project.description}</p>}
              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <span>{done}/{projectTasks.length} tasks</span>
                <span>{project.progress}%</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * The dashboard reads the workspace once and shares it with the bar, the charts and the grid —
 * they used to fetch independently, which fanned out the per-project task calls three times.
 */
const DashboardPage = ({ onSelectProject }: { onSelectProject: (projectId: number) => void }) => {
  const { projects, tasks, loading, error } = useWorkspace();

  return (
    <>
      <DashboardSummaryBar projects={projects} tasks={tasks} loading={loading} />
      <div className="flex-1 overflow-y-auto">
        {!loading && !error && <DashboardCharts projects={projects} tasks={tasks} />}
        <ProjectGrid
          projects={projects}
          tasks={tasks}
          loading={loading}
          error={error}
          onSelect={onSelectProject}
        />
      </div>
    </>
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

const NotificationsView = ({
  onUnreadChange,
  onOpenTask,
  onOpenProject,
  refreshToken,
}: {
  onUnreadChange: (count: number) => void;
  onOpenTask: (taskId: number) => void;
  onOpenProject: (projectId: number) => void;
  refreshToken: number;
}) => (
  <NotificationsCenter
    onUnreadChange={onUnreadChange}
    onOpenTask={onOpenTask}
    onOpenProject={onOpenProject}
    refreshToken={refreshToken}
  />
);

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
  const { isMobile, isNarrow } = useViewport();
  const { user, accessToken, isAuthenticated, isReady, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Narrowing the window collapses the sidebar; widening restores whatever the user last chose.
  const userCollapsedRef = useRef(false);
  useEffect(() => {
    setCollapsed(isNarrow ? true : userCollapsedRef.current);
  }, [isNarrow]);
  const [activeProject, setActiveProject] = useState("p1");
  const [activePage, setActivePage] = useState("dashboard");
  const [landedAsAdmin, setLandedAsAdmin] = useState(false);
  const [boardProjectName, setBoardProjectName] = useState<string | null>(null);
  // Only a project leader (or owner/admin) may add tasks; the API decides, this just mirrors it.
  const [canManageBoardTasks, setCanManageBoardTasks] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [boardRefresh, setBoardRefresh] = useState(0);
  // The sidebar tracks ids as strings; the API is numeric.
  const activeProjectId = Number.isFinite(Number(activeProject)) && activeProject ? Number(activeProject) : null;

  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  // Real unread badge — the sidebar used to show a hardcoded 5.
  const [unreadCount, setUnreadCount] = useState(0);
  const [headerNotifications, setHeaderNotifications] = useState<NotificationDto[]>([]);
  const [boardTasks, setBoardTasks] = useState<TaskDetailDto[]>([]);

  // One fetch feeds both the sidebar badge and the header bell.
  const loadNotifications = useCallback(async () => {
    if (!user) {
      setHeaderNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const list = await notificationApi.list(user.userId);
      setHeaderNotifications(list);
      setUnreadCount(list.filter((n) => !n.isRead).length);
    } catch {
      setHeaderNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  /** Stable identity — an inline callback here would re-trigger the child's fetch effect. */
  const handleUnreadChange = useCallback((count: number) => setUnreadCount(count), []);

  /**
   * Closing the bell panel clears the badge. The optimistic zero goes in first so the dot vanishes
   * with the panel rather than a network round-trip later; a failed write is corrected by the
   * refetch that follows.
   */
  const markNotificationsSeen = useCallback(async () => {
    if (!user || unreadCount === 0) return;
    setUnreadCount(0);
    try {
      await notificationApi.markAllRead(user.userId);
    } catch {
      // Ignored: loadNotifications below restores the true count.
    }
    await loadNotifications();
  }, [user, unreadCount, loadNotifications]);

  // Live push. The row is already stored server-side, so this only front-runs the next fetch;
  // duplicates are guarded against because a reconnect can replay while a load is in flight.
  const [notificationNonce, setNotificationNonce] = useState(0);

  const handleRealtimeNotification = useCallback((incoming: NotificationDto) => {
    setHeaderNotifications((current) =>
      current.some((n) => n.notificationId === incoming.notificationId) ? current : [incoming, ...current]
    );
    setUnreadCount((count) => count + 1);
    toast(incoming.title ?? "New notification", { description: incoming.message ?? undefined });
    // The notification page keeps its own list (and the pending-invitation read), so tell it to
    // refetch rather than trying to merge server state into two places.
    setNotificationNonce((n) => n + 1);
  }, []);

  useRealtimeNotifications({ token: accessToken, onNotification: handleRealtimeNotification });


  const canAccessAdministration = isPlatformAdmin(user);

  // An administrator's sidebar has no Dashboard, so landing there would show an empty page behind a
  // nav item that does not exist. Runs once per sign-in, leaving later navigation alone.
  useEffect(() => {
    if (canAccessAdministration && !landedAsAdmin) {
      setActivePage("admin-stats");
      setLandedAsAdmin(true);
    }
  }, [canAccessAdministration, landedAsAdmin]);

  // Organization tools are only meaningful once the user belongs to an organization or holds an
  // organization plan. Hiding the nav is tidiness only — the backend still enforces 403.
  const [canAccessOrganizations, setCanAccessOrganizations] = useState(false);

  const refreshOrganizationAccess = useCallback(async () => {
    if (!user) {
      setCanAccessOrganizations(false);
      return;
    }
    try {
      const entitlement = await billingApi.entitlement().catch(() => null);
      // The organization workspace opens only once an organization plan is actually paid for —
      // `sources` carries an "organization:<id>:<plan>" entry only for an ACTIVE paid subscription.
      const onPaidOrgPlan = (entitlement?.sources ?? []).some((src) => src.startsWith("organization:"));
      setCanAccessOrganizations(onPaidOrgPlan);
    } catch {
      setCanAccessOrganizations(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshOrganizationAccess();
  }, [refreshOrganizationAccess]);

  useEffect(() => {
    if (activePage === "organizations" && !canAccessOrganizations) {
      setActivePage("dashboard");
      return;
    }
    if (activePage === "administration" && !canAccessAdministration) {
      setActivePage("dashboard");
    }
  }, [activePage, canAccessAdministration, canAccessOrganizations]);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    toast.success("You have been signed out.");
  };

  if (!isReady) return null;

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
            animate={{ width: collapsed ? 52 : isNarrow ? 190 : 236 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            <Sidebar
              unreadCount={unreadCount}
              activeProject={activeProject}
              setActiveProject={setActiveProject}
              activePage={activePage}
              setActivePage={setActivePage}
              collapsed={collapsed}
              onSelectProject={() => setActivePage("board")}
              onLogout={() => setShowLogoutModal(true)}
              user={user}
              canAccessAdministration={canAccessAdministration}
              canAccessOrganizations={canAccessOrganizations}
            />
          </motion.div>

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <Header
              user={user}
              onOpenProfile={() => setActivePage("profile")}
              onOpenSettings={() => setActivePage("settings")}
              onLogout={handleLogout}
              notifications={headerNotifications}
              unreadCount={unreadCount}
              onViewAllNotifications={() => setActivePage("notifications")}
              onNotificationsSeen={markNotificationsSeen}
              collapsed={collapsed}
              toggleCollapsed={() => {
                const next = !collapsed;
                userCollapsedRef.current = next;
                setCollapsed(next);
              }}
              onNewTaskToggle={() => setShowNewTaskModal(true)}
              canCreateTask={canManageBoardTasks}
              adminMode={canAccessAdministration}
            />

            <div className="flex-1 flex overflow-hidden w-full relative">
              <main className="flex-1 overflow-hidden flex flex-col min-w-0">
                {/* A crash while rendering one page must not blank the whole console. */}
                <ErrorBoundary resetKey={activePage}>
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
                      <DashboardPage
                        onSelectProject={(projectId) => {
                          setActiveProject(String(projectId));
                          setActivePage("board");
                        }}
                      />
                    </motion.div>
                  )}

                  {activePage === "board" && (
                    <motion.div
                      key="board"
                      className="flex-1 overflow-hidden flex flex-col"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ProjectBoardHeader projectId={activeProjectId} tasks={boardTasks} onProjectLoaded={(name, canManage) => {
                          setBoardProjectName(name);
                          setCanManageBoardTasks(canManage);
                        }}
                        onImportTasks={() => setShowImportModal(true)}
                        onOpenTask={setSelectedTaskId}
                      />
                      <div className="flex-1 overflow-hidden">
                        <KanbanBoard
                          projectId={activeProjectId}
                          projectName={boardProjectName}
                          canManageTasks={canManageBoardTasks}
                          refreshToken={boardRefresh}
                          onTaskClick={(task) => setSelectedTaskId(task.taskId)}
                          onCreateTask={() => setShowNewTaskModal(true)}
                          onTasksLoaded={setBoardTasks}
                        />
                      </div>
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

                  {activePage === "organizations" && (
                    <motion.div
                      key="organizations"
                      className="flex-1 overflow-y-auto p-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <OrganizationCenter />
                    </motion.div>
                  )}

                  {activePage === "subscription" && (
                    <motion.div
                      key="subscription"
                      className="flex-1 overflow-y-auto p-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <SubscriptionCenter onOrganizationsChanged={refreshOrganizationAccess} />
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

                  {/* Each admin sidebar entry maps to one section of the same page. */}
                  {activePage.startsWith("admin-") && canAccessAdministration && (
                    <motion.div
                      key={activePage}
                      className="flex-1 overflow-y-auto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {activePage === "admin-skills" ? (
                        <SkillManagement />
                      ) : (
                        <AdministrationCenter
                          section={activePage.replace("admin-", "") as "stats" | "users" | "organizations" | "billing" | "plans"}
                        />
                      )}
                    </motion.div>
                  )}

                  {activePage === "administration" && canAccessAdministration && (
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
                  {activePage === "profile" && (
                    <motion.div
                      key="profile"
                      className="flex-1 overflow-y-auto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ProfilePage />
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
                      <NotificationsView
                        onUnreadChange={handleUnreadChange}
                        onOpenTask={setSelectedTaskId}
                        onOpenProject={(projectId) => {
                          setActiveProject(String(projectId));
                          setActivePage("board");
                        }}
                        refreshToken={notificationNonce}
                      />
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
                      <SettingsPage
                        unreadCount={unreadCount}
                        onOpenProfile={() => setActivePage("profile")}
                        onOpenNotifications={() => setActivePage("notifications")}
                        onLogout={() => setShowLogoutModal(true)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                </ErrorBoundary>
              </main>

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

      <CreateTaskModal
        open={showNewTaskModal}
        projectId={activeProjectId}
        onClose={() => setShowNewTaskModal(false)}
        onCreated={() => setBoardRefresh((n) => n + 1)}
      />


      {/* Docked assistant; scoped to the open board when there is one. */}
      {!canAccessAdministration && (
        <AssistantChat projectId={activePage === "board" ? activeProjectId : null} />
      )}

      <ImportTasksModal
        open={showImportModal}
        projectId={activeProjectId}
        onClose={() => setShowImportModal(false)}
        onImported={() => setBoardRefresh((n) => n + 1)}
      />

      <TaskDetailModal
        taskId={selectedTaskId}
        projectName={boardProjectName}
        onClose={() => setSelectedTaskId(null)}
        onChanged={() => setBoardRefresh((n) => n + 1)}
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
