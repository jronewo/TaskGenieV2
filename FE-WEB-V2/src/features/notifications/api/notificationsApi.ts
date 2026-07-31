import { apiClient } from "../../../core/api/client";
import { NotificationDto } from "../types";

export const notificationsApi = {
  list: (userId: number) => apiClient.get<NotificationDto[]>(`/Notifications/user/${userId}`),
  unreadCount: (userId: number) => apiClient.get<{ count: number }>(`/Notifications/user/${userId}/unread-count`),
  markRead: (id: number) => apiClient.put<void>(`/Notifications/${id}/read`),
  markAllRead: (userId: number) => apiClient.put<void>(`/Notifications/user/${userId}/read-all`),
  remove: (id: number) => apiClient.delete<void>(`/Notifications/${id}`),
};
