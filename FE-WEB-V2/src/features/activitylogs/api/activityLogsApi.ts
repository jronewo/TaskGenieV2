// MOCK — see MOCK_API_TODO.md. Function names/signatures match /api/activitylogs routes.
import { loadMockState, mockDelay } from "../../../core/api/mock";
import { ActivityLogDto } from "../types";

const logs = loadMockState<ActivityLogDto[]>("activitylogs", [
  { logId: 1, userId: 1, userName: "Alex Nguyen", action: "CREATED_TASK", entityType: "Task", entityId: 12, projectId: 1, createdAt: "2026-07-24T08:12:00Z" },
  { logId: 2, userId: 2, userName: "Bao Le", action: "UPDATED_TASK_STATUS", entityType: "Task", entityId: 12, projectId: 1, createdAt: "2026-07-24T10:00:00Z" },
  { logId: 3, userId: 1, userName: "Alex Nguyen", action: "ADDED_PROJECT_MEMBER", entityType: "Project", entityId: 1, projectId: 1, createdAt: "2026-07-23T15:40:00Z" },
  { logId: 4, userId: 4, userName: "Minh Tran", action: "CLOSED_PROJECT", entityType: "Project", entityId: 3, projectId: 3, createdAt: "2026-07-20T09:00:00Z" },
  { logId: 5, userId: 2, userName: "Bao Le", action: "RAN_AI_RISK_ANALYSIS", entityType: "Task", entityId: 20, projectId: 2, createdAt: "2026-07-22T11:20:00Z" },
]);

export const activityLogsApi = {
  recent: (limit = 50) => mockDelay([...logs].sort((a, b) => +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0)).slice(0, limit)), // TODO: GET /activitylogs?limit=

  byUser: (userId: number) => mockDelay(logs.filter((l) => l.userId === userId)), // TODO: GET /activitylogs/user/{userId}

  byEntity: (entityType: string, entityId: number) => mockDelay(logs.filter((l) => l.entityType === entityType && l.entityId === entityId)), // TODO: GET /activitylogs/entity/{entityType}/{entityId}

  byProject: (projectId: number, limit = 50) =>
    mockDelay(
      [...logs]
        .filter((l) => l.projectId === projectId)
        .sort((a, b) => +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0))
        .slice(0, limit)
    ), // TODO: GET /activitylogs/project/{projectId}?limit=
};
