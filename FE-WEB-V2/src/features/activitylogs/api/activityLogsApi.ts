import { apiClient } from "../../../core/api/client";
import { ActivityLogDto } from "../types";

export const activityLogsApi = {
  recent: (limit = 50) => apiClient.get<ActivityLogDto[]>(`/ActivityLogs?limit=${limit}`),
  byUser: (userId: number) => apiClient.get<ActivityLogDto[]>(`/ActivityLogs/user/${userId}`),
  byEntity: (entityType: string, entityId: number) =>
    apiClient.get<ActivityLogDto[]>(`/ActivityLogs/entity/${entityType}/${entityId}`),
  byProject: (projectId: number, limit = 50) =>
    apiClient.get<ActivityLogDto[]>(`/ActivityLogs/project/${projectId}?limit=${limit}`),
};
