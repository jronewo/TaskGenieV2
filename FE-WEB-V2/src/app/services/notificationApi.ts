import { apiRequest } from "./apiClient";

export interface NotificationDto {
  notificationId: number;
  userId: number | null;
  type: string | null;
  title: string | null;
  message: string | null;
  referenceId: number | null;
  referenceType: string | null;
  projectId?: number | null;
  projectName?: string | null;
  imageUrl?: string | null;
  isRead: boolean | null;
  createdAt: string | null;
}

/**
 * The backend scopes every one of these to the caller (see the Slice 0 authorization fixes), so a
 * userId is still required in the path but the server rejects anyone else's.
 */
export const notificationApi = {
  list: (userId: number) => apiRequest<NotificationDto[]>(`/notifications/user/${userId}`),

  unreadCount: (userId: number) =>
    apiRequest<{ count: number }>(`/notifications/user/${userId}/unread-count`),

  markRead: (notificationId: number) =>
    apiRequest<void>(`/notifications/${notificationId}/read`, { method: "PUT" }),

  markAllRead: (userId: number) =>
    apiRequest<void>(`/notifications/user/${userId}/read-all`, { method: "PUT" }),

  remove: (notificationId: number) =>
    apiRequest<void>(`/notifications/${notificationId}`, { method: "DELETE" }),
};

export interface InvitationDto {
  invitationId: number;
  teamId: number | null;
  teamName: string | null;
  email: string | null;
  status: string | null;
}

/**
 * Invitations addressed to the signed-in user. The API refuses — with a 404, so it never confirms
 * an invitation exists — when the caller is not the addressee, so the decision cannot be taken on
 * someone else's behalf from a forwarded link.
 */
export const invitationApi = {
  /** Invites an email address onto a team. The person must accept before they become a member. */
  create: (teamId: number, email: string) =>
    apiRequest<InvitationDto>("/invitations", {
      method: "POST",
      body: JSON.stringify({ teamId, email }),
    }),

  mine: (email: string) => apiRequest<InvitationDto[]>(`/invitations/user/${encodeURIComponent(email)}`),

  respond: (invitationId: number, status: "Accepted" | "Rejected") =>
    apiRequest<{ message: string }>(`/invitations/${invitationId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
};
