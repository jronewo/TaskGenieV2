import { apiClient } from "../../../core/api/client";
import { CreateTaskRequest, TaskDetailDto, UpdateProgressRequest, UpdateTaskRequest } from "../types";

export const tasksApi = {
  myTasks: () => apiClient.get<TaskDetailDto[]>("/Tasks/my"),
  byProject: (projectId: number) => apiClient.get<TaskDetailDto[]>(`/Tasks?projectId=${projectId}`),
  get: (id: number) => apiClient.get<TaskDetailDto>(`/Tasks/${id}`),
  create: (body: CreateTaskRequest) => apiClient.post<TaskDetailDto>("/Tasks", body),
  update: (id: number, body: UpdateTaskRequest) => apiClient.put<TaskDetailDto>(`/Tasks/${id}`, body),
  remove: (id: number) => apiClient.delete<void>(`/Tasks/${id}`),
  updateProgress: (id: number, body: UpdateProgressRequest) => apiClient.put<TaskDetailDto>(`/Tasks/${id}/progress`, body),
  estimate: (id: number) => apiClient.post<TaskDetailDto>(`/Tasks/${id}/estimate`),
  addDependency: (id: number, dependsOnTaskId: number) =>
    apiClient.post<void>(`/Tasks/${id}/dependencies`, { dependsOnTaskId }),
  removeDependency: (id: number, dependencyId: number) => apiClient.delete<void>(`/Tasks/${id}/dependencies/${dependencyId}`),
};
