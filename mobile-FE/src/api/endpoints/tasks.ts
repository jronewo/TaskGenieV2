import { apiRequest } from '../client';
import type {
  CreateTaskPayload,
  TaskDetail,
  UpdateProgressPayload,
  UpdateTaskPayload,
} from '../types';

export const tasksApi = {
  /** Tasks the current user (from the JWT) is assigned to. */
  getMine: (signal?: AbortSignal) => apiRequest<TaskDetail[]>('/api/tasks/my', { signal }),

  getByProject: (projectId: number, signal?: AbortSignal) =>
    apiRequest<TaskDetail[]>('/api/tasks', { query: { projectId }, signal }),

  getById: (taskId: number, signal?: AbortSignal) =>
    apiRequest<TaskDetail>(`/api/tasks/${taskId}`, { signal }),

  create: (payload: CreateTaskPayload) =>
    apiRequest<TaskDetail>('/api/tasks', { method: 'POST', body: payload }),

  update: (taskId: number, payload: UpdateTaskPayload) =>
    apiRequest<void>(`/api/tasks/${taskId}`, { method: 'PUT', body: payload }),

  remove: (taskId: number) => apiRequest<void>(`/api/tasks/${taskId}`, { method: 'DELETE' }),

  updateProgress: (taskId: number, payload: UpdateProgressPayload) =>
    apiRequest<void>(`/api/tasks/${taskId}/progress`, { method: 'PUT', body: payload }),

  suggestEstimate: (taskId: number) =>
    apiRequest<unknown>(`/api/tasks/${taskId}/estimate`, { method: 'POST' }),

  addDependency: (taskId: number, dependsOnTaskId: number) =>
    apiRequest<{ success: boolean }>(`/api/tasks/${taskId}/dependencies`, {
      method: 'POST',
      body: { dependsOnTaskId },
    }),

  removeDependency: (taskId: number, dependencyId: number) =>
    apiRequest<{ success: boolean }>(`/api/tasks/${taskId}/dependencies/${dependencyId}`, {
      method: 'DELETE',
    }),
};
