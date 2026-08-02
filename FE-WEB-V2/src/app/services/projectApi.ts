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

  list: () => apiRequest<ProjectDto[]>("/projects"),

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
