import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, ChevronRight, Zap, BarChart2,
  Bell, Settings, Users, Plus, LogOut, HelpCircle, Sparkles
} from "lucide-react";
import { projects, Project } from "../data/tmaiData";

interface SidebarProps {
  activeProject: string;
  setActiveProject: (id: string) => void;
  activePage: string;
  setActivePage: (page: string) => void;
  collapsed: boolean;
  onSelectProject?: (p: Project) => void;
  onOpenProject?: (p: Project) => void;
  onLogout?: () => void;
  projects?: Project[];
  userName?: string;
  userRole?: string;
  unreadCount?: number;
  onCreateProject?: () => void;
}

const getRiskDot = (score: number) => {
  if (score >= 70) return "#EF4444";
  if (score >= 40) return "#F59E0B";
  return "#6B7280";
};

// Đoạn code map ProjectItem trong Sidebar.tsx sau khi đã dọn rác AI:
const ProjectItem = ({
  project,
  depth = 0,
  activeProject,
  setActiveProject,
  collapsed,
  onOpenProject,
}: {
  project: Project;
  depth?: number;
  activeProject: string;
  setActiveProject: (id: string) => void;
  collapsed: boolean;
  onOpenProject?: (project: Project) => void;
}) => {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = project.children && project.children.length > 0;
  const isActive = activeProject === project.id;

  return (
    <div>
      <motion.div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-all group relative ${
          isActive ? "bg-white/10 text-white font-semibold" : "text-blue-200 hover:bg-white/5 hover:text-white"
        }`}
        style={{ paddingLeft: collapsed ? "12px" : `${12 + depth * 12}px` }}
        onClick={() => {
          setActiveProject(project.id);
          onOpenProject?.(project);
          if (hasChildren) setExpanded(!expanded);
        }}
        whileHover={{ x: collapsed ? 0 : 2 }}
      >
        {/* XÓA BỎ HOÀN TOÀN ICON PHI THUYỀN, Ổ KHÓA CỦA AI RÁC */}
        {!collapsed && (
          <>
            <span className="text-xs truncate flex-1 tracking-wide">{project.name}</span>
            <div className="flex items-center gap-1.5 ml-auto font-mono text-[10px]">
              {/* Giữ lại chấm rủi ro nhỏ gọn tinh tế */}
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

      {/* Render sub-project nếu có */}
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
              onOpenProject={onOpenProject}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const navItems = (unreadCount: number) => [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "reports", label: "Reports", icon: BarChart2 },
  { id: "team", label: "Team", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
  { id: "settings", label: "Settings", icon: Settings },
];

export const Sidebar = ({
  activeProject,
  setActiveProject,
  activePage,
  setActivePage,
  collapsed,
  onSelectProject,
  onOpenProject,
  onLogout,
  projects: projectList = projects,
  userName = "User",
  userRole = "Project Leader",
  unreadCount = 0,
  onCreateProject,
}: SidebarProps) => {
  return (
    <div
      className="h-full flex flex-col relative overflow-hidden"
      style={{ background: "#1A237E" }}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 p-4 border-b border-white/10 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: "#0D1757" }}>
          <Sparkles size={15} className="text-blue-300" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-base leading-tight tracking-wide">TMAI</div>
            <div className="text-blue-400 text-[10px]">AI Task Intelligence</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-2 mt-3 space-y-0.5">
        {navItems(unreadCount).map(({ id, label, icon: Icon, badge }) => (
          <motion.button
            key={id}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-all relative group ${
              activePage === id
                ? "bg-white/15 text-white"
                : "text-blue-300 hover:bg-white/10 hover:text-white"
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
            {!collapsed && <span className="text-xs font-medium relative z-10">{label}</span>}
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
                {label}
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Projects */}
      <div className="px-2 mt-4 flex-1 overflow-hidden flex flex-col">
        {!collapsed && (
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-blue-400 text-[10px] font-semibold uppercase tracking-wider">Projects</span>
            <motion.button
              className="w-4 h-4 rounded flex items-center justify-center text-blue-400 hover:text-white hover:bg-white/10"
              whileTap={{ scale: 0.9 }}
              onClick={onCreateProject}
            >
              <Plus size={11} />
            </motion.button>
          </div>
        )}
        {collapsed && <div className="w-5 h-px bg-white/15 mx-auto mb-2" />}

        <div className="overflow-y-auto flex-1 space-y-0.5 pr-1">
          {projectList.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              activeProject={activeProject}
              setActiveProject={setActiveProject}
              collapsed={collapsed}
              onOpenProject={onOpenProject}
            />
          ))}
        </div>
      </div>

      {/* Bottom actions */}
      <div className={`p-3 border-t border-white/10 flex gap-2 ${collapsed ? "flex-col items-center" : ""}`}>
        {!collapsed ? (
          <div className="flex items-center gap-2 flex-1">
            <img
              src="https://images.unsplash.com/photo-1601513043334-36a0088140d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=100"
              alt="User"
              className="w-7 h-7 rounded-md object-cover ring-1 ring-blue-400/40"
            />
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{userName}</div>
              <div className="text-blue-400 text-[10px] truncate">{userRole}</div>
            </div>
            <motion.button className="text-blue-400 hover:text-white" whileTap={{ scale: 0.9 }} onClick={onLogout}>
              <LogOut size={14} />
            </motion.button>
          </div>
        ) : (
          <>
            <motion.button className="text-blue-400 hover:text-white relative group" whileTap={{ scale: 0.9 }}>
              <HelpCircle size={16} />
              <div className="absolute left-full ml-2 z-50 hidden group-hover:flex items-center bg-gray-900 text-white text-xs rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-lg">Help</div>
            </motion.button>
            <motion.button className="text-blue-400 hover:text-white relative group" whileTap={{ scale: 0.9 }} onClick={onLogout}>
              <LogOut size={16} />
              <div className="absolute left-full ml-2 z-50 hidden group-hover:flex items-center bg-gray-900 text-white text-xs rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-lg">Log Out</div>
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
};
