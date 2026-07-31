import { apiClient } from "../../../core/api/client";
import {
  AddProjectMemberRequest,
  CreateProjectRequest,
  ProjectDto,
  ProjectSummaryDto,
  UpdateProjectRequest,
} from "../types";

export const projectsApi = {
  list: () => apiClient.get<ProjectDto[]>("/Projects"),
  get: (id: number) => apiClient.get<ProjectDto>(`/Projects/${id}`),
  create: (body: CreateProjectRequest) => apiClient.post<ProjectDto>("/Projects", body),
  update: (id: number, body: UpdateProjectRequest) => apiClient.put<ProjectDto>(`/Projects/${id}`, body),
  remove: (id: number) => apiClient.delete<void>(`/Projects/${id}`),
  addMember: (id: number, body: AddProjectMemberRequest) => apiClient.post<void>(`/Projects/${id}/members`, body),
  summary: (id: number) => apiClient.get<ProjectSummaryDto>(`/Projects/${id}/summary`),
  close: (id: number) => apiClient.post<ProjectSummaryDto>(`/Projects/${id}/close`),
};
