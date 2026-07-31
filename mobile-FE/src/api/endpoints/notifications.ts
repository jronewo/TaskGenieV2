import { apiRequest } from '../client';
import type { AppNotification } from '../types';

export const notificationsApi = {
  getForUser: (userId: number, signal?: AbortSignal) =>
    apiRequest<AppNotification[]>(`/api/notifications/user/${userId}`, { signal }),

  getUnreadCount: (userId: number, signal?: AbortSignal) =>
    apiRequest<{ count: number }>(`/api/notifications/user/${userId}/unread-count`, { signal }),

  markAsRead: (notificationId: number) =>
    apiRequest<void>(`/api/notifications/${notificationId}/read`, { method: 'PUT' }),

  markAllAsRead: (userId: number) =>
    apiRequest<void>(`/api/notifications/user/${userId}/read-all`, { method: 'PUT' }),

  remove: (notificationId: number) =>
    apiRequest<void>(`/api/notifications/${notificationId}`, { method: 'DELETE' }),
};
