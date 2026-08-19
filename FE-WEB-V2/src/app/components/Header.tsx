import React, { useState } from "react";
import { NotificationDto } from "../services/notificationApi";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell, Plus, ChevronDown, Menu,
  X,
  User,
  Settings,
  LogOut} from "lucide-react";

interface HeaderProps {
  collapsed: boolean;
  toggleCollapsed: () => void;
  onNewTaskToggle: () => void;
  /** False disables the New button — task creation is a project-leader action. */
  canCreateTask?: boolean;
  /** A platform administrator has no board, so the workspace actions are hidden. */
  adminMode?: boolean;
  /** Real notifications for the bell dropdown; the header used to fabricate its own list. */
  notifications?: NotificationDto[];
  unreadCount?: number;
  onViewAllNotifications?: () => void;
  /** Called once the bell panel closes, so the shell can mark what was shown as read. */
  onNotificationsSeen?: () => void;
  /** Signed-in identity for the account menu. */
  user?: { name: string | null; email: string | null; role: string; avatar?: string | null } | null;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

/** Types the backend raises for genuinely time-critical events. */
const URGENT_TYPES = new Set(["RISK", "DEADLINE", "BLOCKER"]);

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const Header = ({ 
  user,
  onOpenProfile,
  onOpenSettings,
  onLogout,
  notifications = [],
  unreadCount = 0,
  onViewAllNotifications,
  onNotificationsSeen,
  collapsed, 
  toggleCollapsed, 
  onNewTaskToggle,
  canCreateTask = false,
  adminMode = false
}: HeaderProps) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  return (
    <header className="relative z-40 flex h-12 select-none items-center gap-2 border-b border-gray-200 bg-white pl-2 pr-1.5 sm:gap-3 sm:pl-4 sm:pr-2">
      {/* Sidebar toggle */}
      <motion.button
        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Toggle sidebar"
        onClick={toggleCollapsed}
        whileTap={{ scale: 0.9 }}
      >
        <Menu size={16} />
      </motion.button>

      {/* Breadcrumb */}
      <div className="hidden shrink-0 items-center gap-1.5 text-xs lg:flex">
        <span className="text-gray-400">TaskGenie</span>
        <ChevronDown size={12} className="text-gray-300 rotate-[-90deg]" />
        <span className="font-semibold text-gray-700">Projects</span>
      </div>

      <div className="min-w-0 flex-1" />

      {/* New Task Button — a workspace action; hidden for platform administration. */}
      {!adminMode && (
      <motion.button
        onClick={onNewTaskToggle}
        disabled={!canCreateTask}
        title={canCreateTask ? undefined : "Only the project leader can add tasks to this project"}
        className="flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: "#1A237E" }}
        whileTap={canCreateTask ? { scale: 0.97 } : undefined}
      >
        <Plus size={13} />
        <span className="hidden sm:inline">New</span>
      </motion.button>
      )}

      {/* Notifications Dropdown */}
      {!adminMode && (
      <div className="relative">
        <motion.button
          className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-500 relative cursor-pointer"
          onClick={() => {
            // Closing after a look is the "I have seen these" signal; opening alone is not.
            if (showNotifs) onNotificationsSeen?.();
            setShowNotifs(!showNotifs);
          }}
          whileTap={{ scale: 0.9 }}
        >
          <Bell size={15} />
          {unreadCount > 0 && (
            <span
              className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500 ring-1 ring-white"
              aria-label={`${unreadCount} unread`}
            />
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
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-600 rounded-full px-2 py-0.5 font-medium">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[11px] text-gray-400">No notifications yet.</p>
                ) : (
                  notifications.slice(0, 6).map((n) => {
                    const urgent = !n.isRead && URGENT_TYPES.has((n.type ?? "").toUpperCase());
                    return (
                      <motion.div
                        key={n.notificationId}
                        className={`flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer ${
                          urgent ? "bg-red-50/40" : ""
                        }`}
                        whileHover={{ x: 2 }}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${urgent ? "bg-red-500" : n.isRead ? "bg-gray-300" : "bg-[#1A237E]"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-gray-700 leading-relaxed">{n.title ?? n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{relativeTime(n.createdAt)}</p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
              <div className="px-4 py-2 border-t border-gray-100">
                <button type="button" onClick={onViewAllNotifications} className="text-[11px] text-blue-600 font-medium hover:text-blue-800 cursor-pointer">View all</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}

      {/* Account menu — pinned to the right edge, with a divider marking it off from the actions. */}
      <div className="relative ml-1 shrink-0 border-l border-gray-200 pl-2">
        <motion.button
          type="button"
          onClick={() => setShowAccount((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={showAccount}
          aria-label="Account menu"
          className="flex cursor-pointer items-center gap-2 rounded-lg py-0.5 pl-0.5 pr-1 hover:bg-gray-50 lg:pr-2"
          whileTap={{ scale: 0.97 }}
        >
          <span className="h-8 w-8 shrink-0 overflow-hidden rounded-lg ring-1 ring-gray-200">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="h-full w-full select-none object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-[#1A237E] text-[11px] font-semibold text-white">
                {(user?.name ?? "?").trim().charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          {/* Name and role only once the window is wide enough to hold them. */}
          <span className="hidden min-w-0 text-left lg:block">
            <span className="block max-w-[9rem] truncate text-[11px] font-semibold text-gray-800">
              {user?.name ?? "Account"}
            </span>
            <span className="block text-[9px] uppercase tracking-wide text-gray-400">
              {user?.role === "PLATFORM_ADMIN" ? "Admin" : "Member"}
            </span>
          </span>
          <ChevronDown size={12} className="hidden shrink-0 text-gray-400 lg:block" aria-hidden />
        </motion.button>

        <AnimatePresence>
          {showAccount && (
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <div className="w-10 h-10 rounded-lg overflow-hidden ring-1 ring-gray-200 shrink-0">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-[#1A237E] text-sm font-semibold text-white">
                      {(user?.name ?? "?").trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{user?.name ?? "Signed in"}</p>
                  <p className="truncate text-[11px] text-gray-500">{user?.email}</p>
                  <span className="mt-1 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                    {user?.role === "PLATFORM_ADMIN" ? "Administrator" : "Member"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                role="menuitem"
                onClick={() => { setShowAccount(false); onOpenProfile?.(); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User size={15} className="text-gray-400" aria-hidden /> Profile
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setShowAccount(false); onOpenSettings?.(); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Settings size={15} className="text-gray-400" aria-hidden /> Settings
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setShowAccount(false); onLogout?.(); }}
                className="flex w-full items-center gap-2.5 border-t border-gray-100 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut size={15} aria-hidden /> Logout
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};