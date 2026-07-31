import React from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Loader2, Trash2, CheckCheck } from "lucide-react";
import { ApiError } from "../../../core/api/client";
import {
  useNotificationsList,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "../hooks/useNotifications";

export default function NotificationsPage() {
  const { data: notifications, isLoading, isError } = useNotificationsList();
  const { data: unread } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const removeNotification = useDeleteNotification();

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
      toast.success("All notifications marked as read.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Thao tác thất bại.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await removeNotification.mutateAsync(id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Xoá thông báo thất bại.");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
          <p className="text-[10px] text-gray-500 mt-0.5">{unread?.count ?? 0} unread</p>
        </div>
        {!!unread?.count && (
          <button onClick={handleMarkAllRead} className="flex items-center gap-1.5 text-xs font-semibold text-[#1A237E] hover:text-[#0D1757]">
            <CheckCheck size={13} /> Mark all as read
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
          <Loader2 className="animate-spin" size={16} /> Loading notifications...
        </div>
      )}
      {isError && <div className="py-10 text-center text-sm text-red-500">Không tải được thông báo.</div>}
      {!isLoading && !isError && (notifications ?? []).length === 0 && (
        <div className="py-10 text-center text-sm text-gray-400">No notifications yet.</div>
      )}

      <div className="space-y-2">
        {(notifications ?? []).map((notif, i) => (
          <motion.div
            key={notif.notificationId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`flex items-start gap-3 p-3 rounded-lg border ${!notif.isRead ? "bg-blue-50/50 border-blue-100" : "bg-white border-gray-100"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${!notif.isRead ? "bg-blue-500" : "bg-gray-300"}`} />
            <div className="flex-1 min-w-0" onClick={() => !notif.isRead && markRead.mutate(notif.notificationId)}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-gray-900">{notif.title}</p>
                {notif.type && (
                  <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-semibold shrink-0 uppercase">{notif.type}</span>
                )}
              </div>
              <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{notif.message}</p>
              <p className="text-[10px] text-gray-400 mt-1">{notif.createdAt ? new Date(notif.createdAt).toLocaleString() : ""}</p>
            </div>
            <button onClick={() => handleDelete(notif.notificationId)} className="text-gray-300 hover:text-red-500 shrink-0">
              <Trash2 size={13} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
