import { apiRequest } from "./apiClient";

export interface ProjectDto {
  projectId: number;
  createdBy?: number | null;
  name: string;
  description?: string | null;
  status?: string | null;
  organizationId?: number | null;
  organizationName?: string | null;
  teamId?: number | null;
  teamName?: string | null;
  deadline?: string | null;
  progress: number;
  predictedEndDate?: string | null;
  /** Hours a member is expected to work per day; null means the platform default of 8. */
  workingHoursPerDay?: number | null;
  riskLevel: string;
  /** Rendering hint from the API: may the caller create tasks here? Endpoints enforce it too. */
  canManageTasks?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TaskSummaryDto {
  taskId: number;
  projectId?: number | null;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
}

export interface ProjectMemberScoreDto {
  userId: number;
  userName?: string | null;
  avatar?: string | null;
  level: string;
  taskScore: number;
  closureScore: number;
  totalProjectScore: number;
}

/** What closing a project returns: the closure report the API computed and persisted. */
export interface ProjectSummaryDto {
  projectId: number;
  projectName?: string | null;
  deadline?: string | null;
  closedAt: string;
  /** "Early" | "OnTime" | "Late" */
  projectCompletionStatus: string;
  /** Positive = days early, negative = days late. */
  daysVsDeadline: number;
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  onTimeTaskRate: number;
  projectClosureScorePerMember: number;
  /** "REWARD" | "PENALTY" */
  projectClosureScoreType: string;
  memberScores: ProjectMemberScoreDto[];
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  deadline?: string;
  /** Files the project under an organization; the API rejects it unless you may manage that org. */
  organizationId?: number | null;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  deadline?: string;
}

// Actor identity is derived server-side from the Bearer token; callers only ever
// reference projects/tasks by ID, never an actor or leader ID.
export const projectApi = {
  /** Project-leader only; the API rejects anyone else. Drives the risk estimate's capacity side. */
  setWorkingHours: (projectId: number, workingHoursPerDay: number) =>
    apiRequest<{ workingHoursPerDay: number }>(`/projects/${projectId}/working-hours`, {
      method: "PUT",
      body: JSON.stringify({ workingHoursPerDay }),
    }),

  /** Active projects only — a closed project is finished work and drops out of the workspace. */
  list: () => apiRequest<ProjectDto[]>("/projects"),

  /** The projects that have been ended, for the finished-work list on the profile. */
  listClosed: () => apiRequest<ProjectDto[]>("/projects?closed=true"),

  /**
   * Ends the project: status becomes "Completed", it leaves every active list, and the API awards
   * the closure scores. Irreversible from the UI, so always confirm first.
   */
  close: (projectId: number) =>
    apiRequest<ProjectSummaryDto>(`/projects/${projectId}/close`, { method: "POST" }),

  getById: (projectId: number) => apiRequest<ProjectDto>(`/projects/${projectId}`),

  create: (request: CreateProjectRequest) =>
    apiRequest<ProjectDto>("/projects", {
      method: "POST",
      body: JSON.stringify(request),
    }),

  update: (projectId: number, request: UpdateProjectRequest) =>
    apiRequest<void>(`/projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(request),
    }),

  remove: (projectId: number) =>
    apiRequest<void>(`/projects/${projectId}`, { method: "DELETE" }),

  getTasksByProject: (projectId: number) =>
    apiRequest<TaskSummaryDto[]>(`/tasks?projectId=${projectId}`),
};
