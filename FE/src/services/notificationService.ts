import { api } from "../lib/apiClient";
import { mapNotification, type NotificationItem } from "../mappers";
import type { NotificationDto } from "../types/api";

export async function fetchUserNotifications(userId: number): Promise<NotificationItem[]> {
  const dtos = await api<NotificationDto[]>(`/notifications/user/${userId}`);
  return dtos.map(mapNotification);
}

export async function fetchUnreadCount(userId: number): Promise<number> {
  const res = await api<{ count: number }>(`/notifications/user/${userId}/unread-count`);
  return res.count;
}

export async function markNotificationRead(id: number): Promise<void> {
  await api(`/notifications/${id}/read`, { method: "PUT" });
}
