import { apiRequest } from "./apiClient";

export interface ProjectDto {
  projectId: number;
  createdBy: number;
  name: string;
  description: string | null;
  status: string;
  organizationId: number | null;
  organizationName: string | null;
  teamId: number | null;
  teamName: string | null;
  deadline: string | null;
  progress: number;
  predictedEndDate: string | null;
  riskLevel: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  createdBy: number;
  organizationId?: number;
  deadline?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: string;
  teamId?: number;
  deadline?: string;
}

export const projectsApi = {
  list: () => apiRequest<ProjectDto[]>("/Projects"),

  getById: (id: number) => apiRequest<ProjectDto>(`/Projects/${id}`),

  create: (input: CreateProjectInput) =>
    apiRequest<ProjectDto>("/Projects", { method: "POST", body: JSON.stringify(input) }),

  update: (id: number, input: UpdateProjectInput) =>
    apiRequest<void>(`/Projects/${id}`, { method: "PUT", body: JSON.stringify(input) }),

  remove: (id: number) => apiRequest<void>(`/Projects/${id}`, { method: "DELETE" }),
};
