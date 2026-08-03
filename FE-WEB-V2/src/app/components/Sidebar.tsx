import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, ChevronRight, Zap, BarChart2, Kanban,
  Bell, Settings, Users, Plus, LogOut, HelpCircle, Sparkles, Briefcase, ClipboardCheck, Shield, BrainCircuit,
  Building2, CreditCard, Layers
} from "lucide-react";
import { useWorkspace } from "../hooks/useWorkspace";
import { ProjectDto } from "../services/projectApi";
import { AuthUser } from "../auth/types";
import { usePreferences } from "../settings/PreferencesContext";

interface SidebarProps {
  activeProject: string;
  setActiveProject: (id: string) => void;
  activePage: string;
  setActivePage: (page: string) => void;
  collapsed: boolean;
  onSelectProject?: (p: Project) => void;
  onLogout?: () => void;
  user?: AuthUser | null;
  canAccessAdministration?: boolean;
  /** Real unread notification count; the badge is hidden when zero. */
  unreadCount?: number;
  /** Organization tools only appear once the user actually belongs to one or holds an org plan. */
  canAccessOrganizations?: boolean;
  /** Bumped by the shell when the project list changed elsewhere — closing a project, for
   *  instance — since the sidebar holds its own workspace snapshot. */
  refreshToken?: number;
}

/** The sidebar's view of a project, mapped from the API's ProjectDto. */
interface Project {
  id: string;
  name: string;
  riskScore: number;
  taskCount: number;
  children?: Project[];
}

const RISK_SCORE: Record<string, number> = { HIGH: 85, MEDIUM: 55, LOW: 20 };

/**
 * A platform administrator manages the platform, not a board — so they get the five admin sections
 * instead of the project workspace. Mixing both produced a sidebar where "Projects" and
 * "Organizations" meant something different depending on which one you clicked.
 */
const ADMIN_NAV = [
  { id: "admin-stats", labelKey: "nav.overview", icon: BarChart2 },
  { id: "admin-users", labelKey: "nav.users", icon: Users },
  { id: "admin-organizations", labelKey: "nav.organizations", icon: Building2 },
  { id: "admin-billing", labelKey: "nav.billing", icon: CreditCard },
  { id: "admin-plans", labelKey: "nav.plans", icon: Layers },
  { id: "admin-skills", labelKey: "nav.skills", icon: Sparkles },
];

const toSidebarProject = (p: ProjectDto, taskCount: number): Project & { organizationName?: string | null } => ({
  id: String(p.projectId),
  name: p.name,
  riskScore: RISK_SCORE[(p.riskLevel ?? "LOW").toUpperCase()] ?? 20,
  taskCount,
  organizationName: p.organizationName,
});

const getRiskDot = (score: number) => {
  if (score >= 70) return "#EF4444";
  if (score >= 40) return "#F59E0B";
  return "#6B7280";
};

const ProjectItem = ({
  project,
  depth = 0,
  activeProject,
  setActiveProject,
  collapsed,
  onSelectProject,
  setActivePage,
}: {
  project: Project & { organizationName?: string | null };
  depth?: number;
  activeProject: string;
  setActiveProject: (id: string) => void;
  collapsed: boolean;
  onSelectProject?: (project: Project) => void;
  setActivePage?: (page: string) => void;
}) => {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = project.children && project.children.length > 0;
  const isActive = activeProject === project.id;

  return (
    <div>
      <motion.div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-all group relative ${
          isActive ? "bg-white/10 text-white font-semibold" : "text-slate-200 hover:bg-white/5 hover:text-white"
        }`}
        style={{ paddingLeft: collapsed ? "12px" : `${12 + depth * 12}px` }}
        onClick={() => {
          setActiveProject(project.id);
          onSelectProject?.(project);
          if (hasChildren) setExpanded(!expanded);
        }}
        whileHover={{ x: collapsed ? 0 : 2 }}
      >
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs tracking-wide">{project.name}</span>
              {project.organizationName && (
                <span className="block truncate text-[9px] text-slate-400">{project.organizationName}</span>
              )}
            </span>
            <div className="flex items-center gap-1.5 ml-auto font-mono text-[10px]">
              <div
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  project.riskScore >= 80 ? "bg-red-500" : project.riskScore >= 60 ? "bg-amber-500" : "bg-green-500"
                }`}
              />
              <span className="opacity-60">{project.taskCount}</span>
            </div>
            {hasChildren && (
              <motion.div animate={{ rotate: expanded ? 90 : 0 }} className="opacity-40">
                <ChevronRight size={11} />
              </motion.div>
            )}
          </>
        )}
      </motion.div>

      {hasChildren && !collapsed && expanded && (
        <div className="mt-0.5 space-y-0.5">
          {project.children!.map((child) => (
            <ProjectItem
              key={child.id}
              project={child}
              depth={depth + 1}
              activeProject={activeProject}
              setActiveProject={setActiveProject}
              collapsed={collapsed}
              onSelectProject={onSelectProject}
              setActivePage={setActivePage}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const navItems = [
  { id: "dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { id: "board", labelKey: "nav.board", icon: Kanban },
  { id: "projects", labelKey: "nav.projects", icon: Briefcase },
  { id: "team", labelKey: "nav.team", icon: Users },
  { id: "organizations", labelKey: "nav.organizations", icon: Building2 },
  { id: "subscription", labelKey: "nav.subscription", icon: CreditCard },
  { id: "evaluations", labelKey: "nav.evaluations", icon: ClipboardCheck },
  { id: "administration", labelKey: "nav.administration", icon: Shield },
  { id: "notifications", labelKey: "nav.notifications", icon: Bell as typeof Bell, badge: undefined as number | undefined },
];

export const Sidebar = ({
  activeProject, setActiveProject, activePage, setActivePage, collapsed,
  onSelectProject, onLogout, user, canAccessAdministration, unreadCount = 0,
  canAccessOrganizations = false, refreshToken = 0,
}: SidebarProps) => {
  const { t } = usePreferences();

  const visibleNavItems = (canAccessAdministration ? ADMIN_NAV : navItems)
    .filter((item) => item.id !== "administration" || canAccessAdministration)
    .filter((item) => item.id !== "organizations" || canAccessOrganizations)
    // The badge is data, not configuration — it comes from the unread count.
    .map((item) => (item.id === "notifications" && unreadCount > 0 ? { ...item, badge: unreadCount } : item))
;

  // Each ownership group folds on its own: someone in three organisations wants to close the ones
  // they are not working in, not the whole list.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ personal: true, organization: true });
  const toggleGroup = (key: string) => setOpenGroups((g) => ({ ...g, [key]: !g[key] }));

  // canAccessAdministration already means "platform admin" here.
  const adminMode = canAccessAdministration;

  const workspace = useWorkspace();

  // Skips the first render: the hook has already fetched by then, and refetching would double
  // every sidebar load.
  const firstRefresh = useRef(true);
  useEffect(() => {
    if (firstRefresh.current) {
      firstRefresh.current = false;
      return;
    }
    workspace.reload();
    // `reload` is a stable useCallback; depending on the whole workspace object would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const sidebarProjects = workspace.projects.map((p) =>
    toSidebarProject(p, workspace.tasks.filter((t) => t.projectId === p.projectId).length)
  );

  const accountBlock = (
    <div className={`p-3 border-t border-white/10 flex gap-2 ${collapsed ? "flex-col items-center" : ""} ${adminMode ? "border-b border-t-0" : ""}`}>
      {!collapsed ? (
        // min-w-0 on both the row and the name column: without it a long display name grows the
        // flex row past the sidebar and pushes the log-out button off the visible edge instead of
        // truncating.
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="h-7 w-7 shrink-0 overflow-hidden rounded-md ring-1 ring-slate-400/40">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-white/15 text-[11px] font-semibold text-white">
                {(user?.name ?? user?.email ?? "?").trim().charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-xs font-semibold text-white"
              title={user?.name ?? user?.email ?? undefined}
            >
              {user?.name ?? user?.email ?? "Unknown user"}
            </div>
            <div className="truncate text-[10px] text-slate-400">{user?.role ?? ""}</div>
          </div>
          <motion.button
            className="shrink-0 text-blue-400 hover:text-white"
            whileTap={{ scale: 0.9 }}
            onClick={onLogout}
            aria-label="Log out"
          >
            <LogOut size={14} />
          </motion.button>
        </div>
      ) : (
        <motion.button
          className="text-slate-400 hover:text-white relative group"
          whileTap={{ scale: 0.9 }}
          onClick={onLogout}
          aria-label="Log out"
        >
          <LogOut size={16} />
          <div className="absolute left-full ml-2 z-50 hidden group-hover:flex items-center bg-gray-900 text-white text-xs rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-lg">Log Out</div>
        </motion.button>
      )}
    </div>
  );

  return (
    <div
      className="tg-sidebar h-full flex flex-col relative overflow-hidden"
      style={{ background: "#1A237E" }}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 p-4 border-b border-white/10 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: "#0D1757" }}>
          <Sparkles size={15} className="text-slate-300" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-base leading-tight tracking-wide">TaskGenie</div>
            <div className="text-slate-400 text-[10px]">Project Workspace</div>
          </div>
        )}
      </div>

      {adminMode && accountBlock}

      {/* Navigation */}
      <div className="px-2 mt-3 space-y-0.5">
        {visibleNavItems.map(({ id, labelKey, icon: Icon, badge }) => (
          <motion.button
            key={id}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-all relative group ${
              activePage === id
                ? "bg-white/15 text-white"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            } ${collapsed ? "justify-center" : ""}`}
            onClick={() => setActivePage(id)}
            whileHover={{ x: collapsed ? 0 : 2 }}
            whileTap={{ scale: 0.97 }}
          >
            {activePage === id && (
              <motion.div
                layoutId="activeNav"
                className="absolute inset-0 rounded-md"
                style={{ background: "rgba(255,255,255,0.1)" }}
              />
            )}
            <Icon size={16} className="shrink-0 relative z-10" />
            {!collapsed && <span className="text-xs font-medium relative z-10">{t(labelKey)}</span>}
            {badge && !collapsed && (
              <span className="ml-auto bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center relative z-10">
                {badge}
              </span>
            )}
            {badge && collapsed && (
              <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
            {collapsed && (
              <div className="absolute left-full ml-2 z-50 hidden group-hover:flex items-center bg-gray-900 text-white text-xs rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                {t(labelKey)}
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Projects — a workspace concern; an administrator manages the platform instead. */}
      <div className={`px-2 mt-4 flex-1 overflow-hidden flex flex-col ${adminMode ? "hidden" : ""}`}>
        {!collapsed && (
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Projects</span>
            <motion.button
              type="button"
              onClick={() => setActivePage("projects")}
              aria-label="Add project"
              title="Add project"
              className="w-4 h-4 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
              whileTap={{ scale: 0.9 }}
            >
              <Plus size={11} />
            </motion.button>
          </div>
        )}
        {collapsed && <div className="w-5 h-px bg-white/15 mx-auto mb-2" />}

        <div className="overflow-y-auto flex-1 space-y-0.5 pr-1">
          {workspace.loading && !collapsed && (
            <p className="px-3 py-2 text-[10px] text-slate-400">Loading projects…</p>
          )}
          {!workspace.loading && sidebarProjects.length === 0 && !collapsed && (
            <p className="px-3 py-2 text-[10px] text-slate-400">No projects yet.</p>
          )}
          {[
            { key: "personal", label: t("nav.group.personal"), items: sidebarProjects.filter((p) => !p.organizationName) },
            { key: "organization", label: t("nav.group.organization"), items: sidebarProjects.filter((p) => p.organizationName) },
          ]
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <div key={group.key} className="mb-1">
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={openGroups[group.key]}
                    className="flex w-full items-center gap-1 px-3 pb-0.5 pt-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 hover:text-white"
                  >
                    <motion.span animate={{ rotate: openGroups[group.key] ? 90 : 0 }} className="inline-flex">
                      <ChevronRight size={9} />
                    </motion.span>
                    {group.label}
                    <span className="ml-auto font-mono normal-case tracking-normal opacity-60">
                      {group.items.length}
                    </span>
                  </button>
                )}
                {(collapsed || openGroups[group.key]) && group.items.map((project) => (
                  <ProjectItem
                    key={project.id}
                    project={project}
                    activeProject={activeProject}
                    setActiveProject={setActiveProject}
                    collapsed={collapsed}
                    onSelectProject={onSelectProject}
                    setActivePage={setActivePage}
                  />
                ))}
              </div>
            ))}
        </div>
      </div>

      {!adminMode && accountBlock}
    </div>
  );
};
