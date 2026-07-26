import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rewardsApi } from "../api/rewardsApi";
import { ApplyManualScoreRequest } from "../types";

const historyKey = (userId: number) => ["rewards", "history", userId] as const;
const summaryKey = (userId: number) => ["rewards", "summary", userId] as const;
const leaderboardKey = (projectId: number) => ["rewards", "leaderboard", projectId] as const;

export function useScoreHistory(userId: number | null) {
  return useQuery({
    queryKey: userId ? historyKey(userId) : ["rewards", "history", "none"],
    queryFn: () => rewardsApi.history(userId as number),
    enabled: userId !== null,
  });
}

export function useScoreSummary(userId: number | null, userName?: string | null) {
  return useQuery({
    queryKey: userId ? summaryKey(userId) : ["rewards", "summary", "none"],
    queryFn: () => rewardsApi.summary(userId as number, userName ?? null),
    enabled: userId !== null,
  });
}

export function useLeaderboard(projectId: number | null) {
  return useQuery({
    queryKey: projectId ? leaderboardKey(projectId) : ["rewards", "leaderboard", "none"],
    queryFn: () => rewardsApi.leaderboard(projectId as number),
    enabled: projectId !== null,
  });
}

export function useManualScoreAdjust() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ApplyManualScoreRequest) => rewardsApi.manualAdjust(body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: historyKey(variables.userId) });
      queryClient.invalidateQueries({ queryKey: summaryKey(variables.userId) });
      if (variables.projectId) queryClient.invalidateQueries({ queryKey: leaderboardKey(variables.projectId) });
    },
  });
}
