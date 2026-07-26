import { apiClient } from "../../../core/api/client";
import { EvaluateProjectRequest, MyOrganizationResponse, OrganizationDto, OrganizationProjectDto, ProjectEvaluationDto } from "../types";

export const organizationsApi = {
  adminAll: () => apiClient.get<OrganizationDto[]>("/Organizations/admin/all"),

  my: () => apiClient.get<MyOrganizationResponse>("/Organizations/my"),

  get: (orgId: number) => apiClient.get<OrganizationDto>(`/Organizations/${orgId}`),

  projects: (orgId: number) => apiClient.get<OrganizationProjectDto[]>(`/Organizations/${orgId}/projects`),

  project: (orgId: number, projectId: number) =>
    apiClient.get<OrganizationProjectDto>(`/Organizations/${orgId}/projects/${projectId}`),

  evaluateProject: (orgId: number, projectId: number, body: EvaluateProjectRequest) =>
    apiClient.post<{ message: string }>(`/Organizations/${orgId}/projects/${projectId}/evaluate`, body),

  getEvaluation: (orgId: number, projectId: number) =>
    apiClient.get<ProjectEvaluationDto>(`/Organizations/${orgId}/projects/${projectId}/evaluation`),
};
