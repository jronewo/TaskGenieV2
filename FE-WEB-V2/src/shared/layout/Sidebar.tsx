import React from "react";
import { NavLink } from "react-router";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  Kanban,
  Briefcase,
  Users,
  Bell,
  Sparkles,
  LogOut,
  HelpCircle,
  Building2,
  Mail,
  GraduationCap,
  Calendar,
  ClipboardCheck,
  Award,
  History,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../core/auth/AuthContext";
import { useProjects } from "../../features/projects/hooks/useProjects";
import { useUnreadCount } from "../../features/notifications/hooks/useNotifications";

interface SidebarProps {
  collapsed: boolean;
  onLogout: () => void;
}

const workspaceNav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/tasks", label: "Task Board", icon: Kanban },
  { to: "/app/projects", label: "Projects", icon: Briefcase },
  { to: "/app/teams", label: "Teams", icon: Users },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
];

const insightsNav = [
  { to: "/app/ai-insights", label: "AI Insights", icon: Sparkles },
  { to: "/app/rewards", label: "Rewards & Leaderboard", icon: Award },
  { to: "/app/activity-log", label: "Activity Log", icon: History },
];

const peopleNav = [
  { to: "/app/skills", label: "Skills", icon: GraduationCap },
  { to: "/app/evaluations", label: "Evaluations", icon: ClipboardCheck },
  { to: "/app/meetings", label: "Meetings", icon: Calendar },
  { to: "/app/invitations", label: "Invitations", icon: Mail },
];

const riskDotColor = (riskLevel: string) => {
  if (riskLevel === "CRITICAL" || riskLevel === "HIGH") return "bg-red-500";
  if (riskLevel === "MEDIUM") return "bg-amber-500";
  return "bg-green-500";
};

interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

function NavGroupLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="w-5 h-px bg-white/15 mx-auto my-2" />;
  return <div className="px-2 mb-1.5 mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>;
}

function NavItem({ to, label, icon: Icon, end, collapsed, badge }: NavEntry & { collapsed: boolean; badge?: number }) {
  return (
    <NavLink to={to} end={end}>
      {({ isActive }) => (
        <motion.div
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-all relative group cursor-pointer ${
            isActive ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
          } ${collapsed ? "justify-center" : ""}`}
          whileTap={{ scale: 0.97 }}
        >
          <Icon size={16} className="shrink-0" />
          {!collapsed && <span className="text-xs font-medium flex-1">{label}</span>}
          {!collapsed && !!badge && (
            <span className="ml-auto bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{badge}</span>
          )}
          {collapsed && !!badge && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />}
          {collapsed && (
            <div className="absolute left-full ml-2 z-50 hidden group-hover:flex items-center bg-gray-900 text-white text-xs rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-lg">
              {label}
            </div>
          )}
        </motion.div>
      )}
    </NavLink>
  );
}

export const Sidebar = ({ collapsed, onLogout }: SidebarProps) => {
  const { user } = useAuth();
  const { data: projects } = useProjects();
  const { data: unread } = useUnreadCount();
  const isAdmin = !!user?.isOrgOwner || user?.role === "Admin";

  return (
    <div className="h-full flex flex-col relative overflow-hidden" style={{ background: "#1A237E" }}>
      <div className={`flex items-center gap-3 p-4 border-b border-white/10 shrink-0 ${collapsed ? "justify-center" : ""}`}>
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

      <div className="flex-1 overflow-y-auto px-2 pt-3">
        <div className="space-y-0.5">
          {workspaceNav.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} badge={item.label === "Notifications" ? unread?.count : undefined} />
          ))}
        </div>

        <NavGroupLabel label="Insights" collapsed={collapsed} />
        <div className="space-y-0.5">
          {insightsNav.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </div>

        <NavGroupLabel label="People" collapsed={collapsed} />
        <div className="space-y-0.5">
          {peopleNav.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </div>

        {isAdmin && (
          <>
            <NavGroupLabel label="Admin" collapsed={collapsed} />
            <div className="space-y-0.5">
              <NavItem to="/app/organizations" label="Organizations" icon={Building2} collapsed={collapsed} />
              <NavItem to="/app/admin" label="Platform Stats" icon={ShieldAlert} collapsed={collapsed} />
            </div>
          </>
        )}

        <NavGroupLabel label="Projects" collapsed={collapsed} />
        <div className="space-y-0.5 pb-2">
          {(projects ?? []).map((project) => (
            <NavLink key={project.projectId} to={`/app/projects/${project.projectId}`}>
              {({ isActive }) => (
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                    isActive ? "bg-white/10 text-white font-semibold" : "text-slate-200 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {!collapsed && (
                    <>
                      <span className="text-xs truncate flex-1 tracking-wide">{project.name}</span>
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${riskDotColor(project.riskLevel)}`} />
                    </>
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      <div className={`p-3 border-t border-white/10 flex gap-2 shrink-0 ${collapsed ? "flex-col items-center" : ""}`}>
        {!collapsed ? (
          <NavLink to="/app/profile" className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user?.name ?? user?.email}</div>
              <div className="text-slate-400 text-[10px] truncate">{user?.role}</div>
            </div>
            <motion.button
              className="text-blue-400 hover:text-white"
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.preventDefault();
                onLogout();
              }}
            >
              <LogOut size={14} />
            </motion.button>
          </NavLink>
        ) : (
          <>
            <div className="text-slate-400">
              <HelpCircle size={16} />
            </div>
            <motion.button className="text-slate-400 hover:text-white" whileTap={{ scale: 0.9 }} onClick={onLogout}>
              <LogOut size={16} />
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
};
