import { apiRequest } from "./apiClient";

/** Backend status values — the UI must send these exact strings. */
export type TaskStatusValue = "Todo" | "InProgress" | "InReview" | "Done" | "Backlog";
export type RiskLevelValue = "LOW" | "MEDIUM" | "HIGH";

export interface TaskAssigneeDto {
  userId: number;
  userName?: string | null;
  /** The API sends `avatar` here — note the task *comment* DTO sends `userAvatar`. Reading the
      wrong one is silent: the field is optional, so it just renders initials forever. */
  avatar?: string | null;
}

/** Field names mirror the API exactly — `dependsOnTitle`/`dependsOnStatus` were wrong and
 *  silently rendered every blocker as "Untitled task". */
export interface TaskDependencyDto {
  dependencyId: number;
  dependsOnTaskId: number;
  dependsOnTaskTitle?: string | null;
  status?: string | null;
}

export interface TaskDetailDto {
  taskId: number;
  projectId?: number | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  deadline?: string | null;
  startDate?: string | null;
  estimatedTime?: number | null;
  aiEstimatedTime?: number | null;
  actualTime?: number | null;
  progress?: number | null;
  riskLevel?: string | null;
  aiSummary?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
  createdBy?: number | null;
  isLate?: boolean;
  daysLateOrEarly?: number | null;
  assignees: TaskAssigneeDto[];
  dependencies: TaskDependencyDto[];
  /** How many other tasks are waiting on this one. */
  blockingCount?: number;
  requiredSkillIds: number[];
}

export interface TaskCommentDto {
  commentId: number;
  taskId: number;
  userId: number;
  userName?: string | null;
  /** Named to match the API's `userAvatar`; reading `avatar` silently rendered initials forever. */
  userAvatar?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  createdAt?: string | null;
}

export interface TaskTypeDto {
  taskTypeId: number;
  code: string;
  name: string;
  colorHex?: string | null;
  isActive: boolean;
}

export interface DependencyGraphNode {
  id: string;
  title: string;
  status?: string | null;
  priority?: string | null;
  deadline?: string | null;
  assigneeName?: string | null;
  /** 0 can start now; each step waits on everything below it. */
  level: number;
  blockedByCount: number;
  blocksCount: number;
  isReady: boolean;
  inCycle: boolean;
}

export interface DependencyGraphEdge {
  id: string;
  /** The prerequisite — must finish first. */
  source: string;
  target: string;
  isBlocking: boolean;
}

export interface DependencyGraphDto {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
  hasCycle: boolean;
  levelCount: number;
}

export interface CreateTaskPayload {
  projectId: number;
  title: string;
  description?: string | null;
  priority?: string | null;
  deadline?: string | null;
  startDate?: string | null;
  difficulty?: number | null;
  taskTypeId?: number | null;
}

export interface UpdateTaskPayload {
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  deadline?: string | null;
  startDate?: string | null;
  estimatedTime?: number | null;
  actualTime?: number | null;
  difficulty?: number | null;
}

// The acting user always comes from the Bearer token — no endpoint here accepts an actor id.
export const taskApi = {
  myTasks: () => apiRequest<TaskDetailDto[]>("/tasks/my"),

  byProject: (projectId: number) => apiRequest<TaskDetailDto[]>(`/tasks?projectId=${projectId}`),

  getById: (taskId: number) => apiRequest<TaskDetailDto>(`/tasks/${taskId}`),

  /** Reference data: the kinds of work a task can be. */
  types: () => apiRequest<TaskTypeDto[]>("/tasks/types"),

  create: (payload: CreateTaskPayload) =>
    apiRequest<TaskDetailDto>("/tasks", { method: "POST", body: JSON.stringify(payload) }),

  update: (taskId: number, payload: UpdateTaskPayload) =>
    apiRequest<TaskDetailDto>(`/tasks/${taskId}`, { method: "PUT", body: JSON.stringify(payload) }),

  remove: (taskId: number) => apiRequest<void>(`/tasks/${taskId}`, { method: "DELETE" }),

  /** Drag/drop and the progress slider both land here. `reason` is required by the API when
   *  `status` is "Backlog" — it's the bug that sent the task back. `force` + `forceDependencyTaskIds`
   *  let a Lead complete a task past an open dependency, optionally force-completing the selected
   *  dependencies in the same call — only meaningful when `status` is "Done". */
  updateProgress: (
    taskId: number,
    payload: {
      status?: string | null;
      progress?: number | null;
      riskLevel?: string | null;
      actualTime?: number | null;
      reason?: string | null;
      force?: boolean;
      forceDependencyTaskIds?: number[];
    }
  ) =>
    apiRequest<TaskDetailDto>(`/tasks/${taskId}/progress`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  /**
   * Assigns the task straight to someone, bypassing the AI recommender — the accept-recommendation
   * endpoint only takes users it had just suggested. Pass null to clear the assignee.
   */
  assign: (taskId: number, userId: number | null) =>
    apiRequest<TaskDetailDto>(`/tasks/${taskId}/assign`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  /** Reads hours and a 1–5 difficulty off the description; returns the whole updated task. */
  estimate: (taskId: number) =>
    apiRequest<TaskDetailDto>(`/tasks/${taskId}/estimate`, { method: "POST" }),

  /** The project's tasks laid out by what has to finish first. */
  dependencyGraph: (projectId: number) =>
    apiRequest<DependencyGraphDto>(`/tasks/project/${projectId}/dependency-graph`),

  addDependency: (taskId: number, dependsOnTaskId: number) =>
    apiRequest<void>(`/tasks/${taskId}/dependencies`, {
      method: "POST",
      body: JSON.stringify({ dependsOnTaskId }),
    }),

  removeDependency: (taskId: number, dependencyId: number) =>
    apiRequest<void>(`/tasks/${taskId}/dependencies/${dependencyId}`, { method: "DELETE" }),

  progressLogs: (taskId: number) =>
    apiRequest<{ logId: number; progress?: number | null; note?: string | null; createdAt?: string | null }[]>(
      `/task-progress/${taskId}/logs`
    ),

  requiredSkills: (taskId: number) =>
    apiRequest<{ id: number; skillId: number; skillName?: string | null; requiredLevel: number }[]>(
      `/taskrequiredskills/${taskId}`
    ),

  /** The level matters: the match score divides the candidate's level by the required one. */
  setRequiredSkills: (taskId: number, skills: { skillId: number; requiredLevel: number }[]) =>
    apiRequest<{ message: string }>(`/taskrequiredskills/${taskId}`, {
      method: "POST",
      body: JSON.stringify({ skills }),
    }),
};

export const commentApi = {
  byTask: (taskId: number) => apiRequest<TaskCommentDto[]>(`/taskcomments/task/${taskId}`),

  create: (taskId: number, content: string, imageUrl?: string | null) =>
    apiRequest<TaskCommentDto>("/taskcomments", {
      method: "POST",
      body: JSON.stringify({ taskId, content, imageUrl: imageUrl ?? null }),
    }),

  remove: (commentId: number) => apiRequest<void>(`/taskcomments/${commentId}`, { method: "DELETE" }),
};
