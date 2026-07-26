import { apiRequest } from '../client';
import type { ProjectScoreLeaderboard, UserScoreSummary } from '../types';

export const scoresApi = {
  getUserSummary: (userId: number, signal?: AbortSignal) =>
    apiRequest<UserScoreSummary>(`/api/user-scores/user/${userId}/summary`, { signal }),

  getProjectLeaderboard: (projectId: number, signal?: AbortSignal) =>
    apiRequest<ProjectScoreLeaderboard>(`/api/user-scores/project/${projectId}/leaderboard`, {
      signal,
    }),
};
