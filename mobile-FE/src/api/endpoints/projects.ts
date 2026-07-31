import { apiRequest } from '../client';
import type { Project, ProjectSummary } from '../types';

export const projectsApi = {
  /** Projects the current user (from the JWT) belongs to. */
  getMine: (signal?: AbortSignal) => apiRequest<Project[]>('/api/projects', { signal }),

  getById: (projectId: number, signal?: AbortSignal) =>
    apiRequest<Project>(`/api/projects/${projectId}`, { signal }),

  /** Preview of the closure report — does not close the project. */
  getSummary: (projectId: number, signal?: AbortSignal) =>
    apiRequest<ProjectSummary>(`/api/projects/${projectId}/summary`, { signal }),

  addMember: (projectId: number, email: string, role: string) =>
    apiRequest<{ message: string }>(`/api/projects/${projectId}/members`, {
      method: 'POST',
      body: { email, role },
    }),
};
