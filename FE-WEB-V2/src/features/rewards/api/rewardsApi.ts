import { apiClient } from "../../../core/api/client";
import { ApplyManualScoreRequest, ProjectScoreLeaderboardDto, UserScoreDto, UserScoreSummaryDto } from "../types";

export const rewardsApi = {
  history: (userId: number) => apiClient.get<UserScoreDto[]>(`/user-scores/user/${userId}`),

  summary: (userId: number) => apiClient.get<UserScoreSummaryDto>(`/user-scores/user/${userId}/summary`),

  leaderboard: (projectId: number) =>
    apiClient.get<ProjectScoreLeaderboardDto>(`/user-scores/project/${projectId}/leaderboard`),

  manualAdjust: (body: ApplyManualScoreRequest) => apiClient.post<UserScoreDto>("/user-scores/manual", body),
};
