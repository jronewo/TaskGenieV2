import { useQuery } from "@tanstack/react-query";
import { activityLogsApi } from "../api/activityLogsApi";

export function useRecentActivity(limit = 50) {
  return useQuery({ queryKey: ["activitylogs", "recent", limit], queryFn: () => activityLogsApi.recent(limit) });
}

export function useProjectActivity(projectId: number | null, limit = 50) {
  return useQuery({
    queryKey: projectId ? (["activitylogs", "project", projectId, limit] as const) : (["activitylogs", "project", "none"] as const),
    queryFn: () => activityLogsApi.byProject(projectId as number, limit),
    enabled: projectId !== null,
  });
}

export function useUserActivity(userId: number | null) {
  return useQuery({
    queryKey: userId ? (["activitylogs", "user", userId] as const) : (["activitylogs", "user", "none"] as const),
    queryFn: () => activityLogsApi.byUser(userId as number),
    enabled: userId !== null,
  });
}
