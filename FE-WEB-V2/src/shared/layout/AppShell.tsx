import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "../../core/auth/AuthContext";
import { useIsMobile } from "../../core/utils/useIsMobile";
import { authApi } from "../../features/auth/api/authApi";

const LogoutModal = ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <motion.div
      className="absolute inset-0 bg-black/25 backdrop-blur-sm"
      onClick={onCancel}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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

export const AppShell = () => {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setShowLogoutModal(false);
    try {
      await authApi.logout();
    } catch {
      // token might already be invalid/expired — proceed to clear local session regardless
    }
    logout();
    toast.success("You have been signed out.");
    navigate("/login", { replace: true });
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 relative" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
      {!isMobile && (
        <motion.div
          className="h-full shrink-0 overflow-hidden"
          animate={{ width: collapsed ? 52 : 220 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
        >
          <Sidebar collapsed={collapsed} onLogout={() => setShowLogoutModal(true)} />
        </motion.div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header collapsed={collapsed} toggleCollapsed={() => setCollapsed(!collapsed)} />
        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          <Outlet />
        </main>
      </div>

      <AnimatePresence>
        {showLogoutModal && <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogoutModal(false)} />}
      </AnimatePresence>
    </div>
  );
};
