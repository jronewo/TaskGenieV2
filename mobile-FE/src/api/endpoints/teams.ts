import { apiRequest } from '../client';
import type { Team } from '../types';

export const teamsApi = {
  /** Teams the current user (from the JWT) belongs to. */
  getMine: (signal?: AbortSignal) => apiRequest<Team[]>('/api/teams/my', { signal }),

  getById: (teamId: number, signal?: AbortSignal) =>
    apiRequest<Team>(`/api/teams/${teamId}`, { signal }),

  addMember: (teamId: number, userId: number, role: string) =>
    apiRequest<{ message: string }>(`/api/teams/${teamId}/members`, {
      method: 'POST',
      body: { userId, role },
    }),

  removeMember: (memberId: number) =>
    apiRequest<void>(`/api/teams/members/${memberId}`, { method: 'DELETE' }),
};
