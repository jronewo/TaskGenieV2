import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Bell, Plus, ChevronDown, Menu,
  Filter, Grid3X3, List, X, Zap
} from "lucide-react";

interface HeaderProps {
  collapsed: boolean;
  toggleCollapsed: () => void;
  view: "kanban" | "list";
  setView: (v: "kanban" | "list") => void;
  onAIToggle: () => void;
  onProfileToggle: () => void; 
  onNewTaskToggle: () => void;  
}

const notifications = [
  { id: 1, type: "risk", message: "Risk Prediction Engine deadline approaching — 2 days", time: "2m ago", urgent: true },
  { id: 2, type: "ai", message: "AI detected deadline conflict in API Integration task", time: "15m ago", urgent: true },
  { id: 3, type: "comment", message: "An Le commented on Performance Benchmarking", time: "1h ago", urgent: false },
  { id: 4, type: "done", message: "Design System Foundations marked as Complete", time: "3h ago", urgent: false },
  { id: 5, type: "assign", message: "You were assigned to Database Schema Design", time: "5h ago", urgent: false },
];

export const Header = ({ 
  collapsed, 
  toggleCollapsed, 
  view, 
  setView, 
  onAIToggle,
  onProfileToggle,
  onNewTaskToggle
}: HeaderProps) => {
  const [searchFocused, setSearchFocused] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 relative z-40 select-none">
      {/* Sidebar toggle */}
      <motion.button
        className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 cursor-pointer"
        onClick={toggleCollapsed}
        whileTap={{ scale: 0.9 }}
      >
        <Menu size={16} />
      </motion.button>

      {/* Breadcrumb */}
      <div className="hidden md:flex items-center gap-1.5 text-xs">
        <span className="text-gray-400">TMAI</span>
        <ChevronDown size={12} className="text-gray-300 rotate-[-90deg]" />
        <span className="font-semibold text-gray-700">Projects</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-sm mx-3">
        <motion.div
          className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors ${
            searchFocused ? "border-blue-400" : "border-gray-200 bg-gray-50"
          }`}
          animate={{ scale: searchFocused ? 1.005 : 1 }}
        >
          <Search size={13} className={searchFocused ? "text-blue-500" : "text-gray-400"} />
          <input
            className="flex-1 bg-transparent text-xs outline-none text-gray-700 placeholder-gray-400 font-medium"
            placeholder="Search tasks, projects..."
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchVal && (
            <button onClick={() => setSearchVal("")} className="cursor-pointer">
              <X size={12} className="text-gray-400 hover:text-gray-600" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center text-[10px] text-gray-300 border border-gray-200 rounded px-1 py-0.5 font-mono">
            ⌘K
          </kbd>
        </motion.div>
      </div>

      {/* AI Active Toggle */}
      <button 
        onClick={onAIToggle}
        className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer outline-none"
      >
        <Zap size={12} className="text-blue-500" />
        <span className="text-[10px] font-medium">AI Active</span>
      </button>

      {/* View Toggle */}
      <div className="hidden sm:flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5">
        {[
          { id: "kanban", Icon: Grid3X3 },
          { id: "list", Icon: List },
        ].map(({ id, Icon }) => (
          <motion.button
            key={id}
            className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer ${
              view === id ? "bg-white shadow-sm text-gray-700" : "text-gray-400 hover:text-gray-600"
            }`}
            onClick={() => setView(id as "kanban" | "list")}
            whileTap={{ scale: 0.9 }}
          >
            <Icon size={13} />
          </motion.button>
        ))}
      </div>

      {/* Filter */}
      <motion.button
        className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 cursor-pointer"
        whileTap={{ scale: 0.9 }}
      >
        <Filter size={14} />
      </motion.button>

      {/* New Task Button */}
      <motion.button
        onClick={onNewTaskToggle}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-white cursor-pointer"
        style={{ background: "#1A237E" }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
      >
        <Plus size={13} />
        <span className="hidden sm:inline">New</span>
      </motion.button>

      {/* Notifications Dropdown */}
      <div className="relative">
        <motion.button
          className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-500 relative cursor-pointer"
          onClick={() => setShowNotifs(!showNotifs)}
          whileTap={{ scale: 0.9 }}
        >
          <Bell size={15} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-white" />
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
                <span className="text-[10px] bg-red-100 text-red-600 rounded-full px-2 py-0.5 font-medium">5 new</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                {notifications.map(n => (
                  <motion.div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer ${
                      n.urgent ? "bg-red-50/40" : ""
                    }`}
                    whileHover={{ x: 2 }}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.urgent ? "bg-red-500" : "bg-gray-300"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-700 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{n.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-gray-100">
                <button className="text-[11px] text-blue-600 font-medium hover:text-blue-800 cursor-pointer">View all</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Avatar */}
      <motion.div
        onClick={onProfileToggle}
        className="w-7 h-7 rounded-md overflow-hidden ring-1 ring-gray-200 cursor-pointer"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <img
          src="https://images.unsplash.com/photo-1601513043334-36a0088140d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=100"
          alt="User"
          className="w-full h-full object-cover select-none"
        />
      </motion.div>
    </header>
  );
};