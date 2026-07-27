import React, { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useLocation, useNavigate } from "react-router";
import { Bell, Menu, Search, X, Plus, ChevronDown, Briefcase, ListTodo } from "lucide-react";
import { useAuth } from "../../core/auth/AuthContext";
import { useNotificationsList, useUnreadCount, useMarkNotificationRead } from "../../features/notifications/hooks/useNotifications";
import { useProjects } from "../../features/projects/hooks/useProjects";
import { useMyTasks } from "../../features/tasks/hooks/useTasks";

interface HeaderProps {
  collapsed: boolean;
  toggleCollapsed: () => void;
}

const sectionLabel = (pathname: string) => {
  if (pathname.startsWith("/app/tasks")) return "Task Board";
  if (pathname.startsWith("/app/projects")) return "Projects";
  if (pathname.startsWith("/app/teams")) return "Teams";
  if (pathname.startsWith("/app/notifications")) return "Notifications";
  if (pathname.startsWith("/app/profile")) return "Profile";
  if (pathname.startsWith("/app/organizations")) return "Organizations";
  if (pathname.startsWith("/app/invitations")) return "Invitations";
  if (pathname.startsWith("/app/skills")) return "Skills";
  if (pathname.startsWith("/app/meetings")) return "Meetings";
  if (pathname.startsWith("/app/evaluations")) return "Evaluations";
  if (pathname.startsWith("/app/rewards")) return "Rewards & Leaderboard";
  if (pathname.startsWith("/app/activity-log")) return "Activity Log";
  if (pathname.startsWith("/app/ai-insights")) return "AI Insights";
  if (pathname.startsWith("/app/admin")) return "Admin";
  return "Dashboard";
};

export const Header = ({ collapsed, toggleCollapsed }: HeaderProps) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [query, setQuery] = useState("");
  const searchBlurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: unread } = useUnreadCount();
  const { data: notifications } = useNotificationsList();
  const markRead = useMarkNotificationRead();
  const { data: projects } = useProjects();
  const { data: myTasks } = useMyTasks();
  const latest = (notifications ?? []).slice(0, 5);

  const q = query.trim().toLowerCase();
  const matchedProjects = useMemo(
    () => (q ? (projects ?? []).filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5) : []),
    [projects, q]
  );
  const matchedTasks = useMemo(
    () => (q ? (myTasks ?? []).filter((t) => (t.title ?? "").toLowerCase().includes(q)).slice(0, 5) : []),
    [myTasks, q]
  );
  const hasResults = matchedProjects.length > 0 || matchedTasks.length > 0;

  const goToProject = (projectId: number) => {
    navigate(`/app/projects/${projectId}`);
    setQuery("");
    setSearchFocused(false);
  };

  const goToTask = (projectId: number | null) => {
    if (projectId == null) return;
    navigate(`/app/tasks/${projectId}`);
    setQuery("");
    setSearchFocused(false);
  };

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 relative z-40 select-none">
      <motion.button
        className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 cursor-pointer"
        onClick={toggleCollapsed}
        whileTap={{ scale: 0.9 }}
      >
        <Menu size={16} />
      </motion.button>

      <div className="hidden md:flex items-center gap-1.5 text-xs shrink-0">
        <span className="text-gray-400">TaskGenie</span>
        <span className="text-gray-300">/</span>
        <span className="font-semibold text-gray-700">{sectionLabel(location.pathname)}</span>
      </div>

      <div className="flex-1 max-w-sm mx-1 relative">
        <div
          className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors ${
            searchFocused ? "border-[#1A237E]" : "border-gray-200 bg-gray-50"
          }`}
        >
          <Search size={13} className={searchFocused ? "text-[#1A237E]" : "text-gray-400"} />
          <input
            className="flex-1 bg-transparent text-xs outline-none text-gray-700 placeholder-gray-400 font-medium min-w-0"
            placeholder="Search projects, my tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (searchBlurTimeout.current) clearTimeout(searchBlurTimeout.current);
              setSearchFocused(true);
            }}
            onBlur={() => {
              searchBlurTimeout.current = setTimeout(() => setSearchFocused(false), 120);
            }}
          />
          {query && (
            <button onClick={() => setQuery("")} className="cursor-pointer shrink-0">
              <X size={12} className="text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {searchFocused && q && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 top-full mt-1.5 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
            >
              {!hasResults && <div className="px-4 py-5 text-center text-xs text-gray-400">No matches for "{query}".</div>}

              {matchedProjects.length > 0 && (
                <div className="py-1.5">
                  <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Projects</div>
                  {matchedProjects.map((p) => (
                    <button
                      key={p.projectId}
                      onMouseDown={() => goToProject(p.projectId)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50"
                    >
                      <Briefcase size={12} className="text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-700 truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {matchedTasks.length > 0 && (
                <div className="py-1.5 border-t border-gray-50">
                  <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">My Tasks</div>
                  {matchedTasks.map((t) => (
                    <button
                      key={t.taskId}
                      onMouseDown={() => goToTask(t.projectId)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50"
                    >
                      <ListTodo size={12} className="text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-700 truncate">{t.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative">
        <motion.button
          onClick={() => setShowNewMenu((v) => !v)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-white cursor-pointer"
          style={{ background: "#1A237E" }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={13} />
          <span className="hidden sm:inline">New</span>
          <ChevronDown size={11} className="opacity-70" />
        </motion.button>

        <AnimatePresence>
          {showNewMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNewMenu(false)} />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
              >
                <button
                  onClick={() => {
                    setShowNewMenu(false);
                    navigate("/app/projects?create=1");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                >
                  <Briefcase size={13} className="text-gray-400" /> New Project
                </button>
                <button
                  onClick={() => {
                    setShowNewMenu(false);
                    navigate("/app/tasks?create=1");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 border-t border-gray-50"
                >
                  <ListTodo size={13} className="text-gray-400" /> New Task
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <div className="relative">
        <motion.button
          className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-500 relative cursor-pointer"
          onClick={() => setShowNotifs((v) => !v)}
          whileTap={{ scale: 0.9 }}
        >
          <Bell size={15} />
          {!!unread?.count && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-white" />
          )}
        </motion.button>

        <AnimatePresence>
          {showNotifs && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
            >
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-800">Notifications</span>
                {!!unread?.count && (
                  <span className="text-[10px] bg-red-100 text-red-600 rounded-full px-2 py-0.5 font-medium">
                    {unread.count} new
                  </span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                {latest.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-gray-400">No notifications yet.</div>
                )}
                {latest.map((n) => (
                  <motion.div
                    key={n.notificationId}
                    className={`flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer ${!n.isRead ? "bg-blue-50/40" : ""}`}
                    whileHover={{ x: 2 }}
                    onClick={() => !n.isRead && markRead.mutate(n.notificationId)}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${!n.isRead ? "bg-blue-500" : "bg-gray-300"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-gray-800">{n.title}</p>
                      <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2">{n.message}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-gray-100">
                <Link
                  to="/app/notifications"
                  onClick={() => setShowNotifs(false)}
                  className="text-[11px] text-blue-600 font-medium hover:text-blue-800 cursor-pointer"
                >
                  View all
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Link to="/app/profile">
        <motion.div
          className="w-7 h-7 rounded-md overflow-hidden ring-1 ring-gray-200 cursor-pointer bg-[#1A237E] flex items-center justify-center text-white text-xs font-bold"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}
        </motion.div>
      </Link>
    </header>
  );
};
