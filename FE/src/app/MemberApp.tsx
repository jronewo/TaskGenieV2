import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { MobileDashboard } from "./components/MobileDashboard";
import { TaskDetailModal } from "./components/TaskDetailModal";
import { useAuth } from "../context/AuthContext";
import { useProject } from "../context/ProjectContext";
import type { Task } from "./data/tmaiData";
import { Loader2 } from "lucide-react";

export function MemberApp() {
  const { user, logout } = useAuth();
  const { tasks, projects, notifications, unreadCount, isLoading, updateTask } = useProject();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = async () => {
    setShowLogout(false);
    await logout();
    toast.success("You have been signed out.");
  };

  const handleProgressUpdate = async (task: Task, progress: number) => {
    const status = progress >= 100 ? "done" : progress > 0 ? "in_progress" : task.status;
    try {
      await updateTask(task.id, status, progress);
      setSelectedTask((prev) => (prev?.id === task.id ? { ...prev, status, progress } : prev));
      toast.success("Progress updated");
    } catch {
      toast.error("Failed to update progress");
    }
  };

  if (isLoading && tasks.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-[#1A237E]" size={32} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 relative">
      <MobileDashboard
        tasks={tasks}
        projects={projects}
        notifications={notifications}
        unreadCount={unreadCount}
        userName={user?.name ?? "Member"}
        onTaskPress={setSelectedTask}
        onLogout={() => setShowLogout(true)}
      />

      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onProgressUpdate={handleProgressUpdate}
      />

      <AnimatePresence>
        {showLogout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/25" onClick={() => setShowLogout(false)} />
            <motion.div
              className="relative bg-white rounded-xl p-6 max-w-xs w-full shadow-2xl z-10"
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
            >
              <h3 className="text-sm font-bold text-gray-900 mb-2">Sign Out?</h3>
              <p className="text-xs text-gray-500 mb-4">Your session will be ended.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLogout(false)}
                  className="flex-1 py-2 text-xs font-semibold border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
