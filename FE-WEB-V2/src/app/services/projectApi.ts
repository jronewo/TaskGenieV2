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
  riskLevel: string;
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
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  deadline?: string;
}

// Actor identity is derived server-side from the Bearer token; callers only ever
// reference projects/tasks by ID, never an actor or leader ID.
export const projectApi = {
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
