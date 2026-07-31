import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskProgressApi } from "../api/taskProgressApi";

const key = (taskId: number) => ["tasks", taskId, "progress-logs"] as const;

export function useTaskProgressLogs(taskId: number | null) {
  return useQuery({
    queryKey: taskId ? key(taskId) : ["tasks", "none", "progress-logs"],
    queryFn: () => taskProgressApi.logs(taskId as number),
    enabled: taskId !== null,
  });
}

export function useAppendProgressLog(taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ progress, note, risk }: { progress: number; note: string | null; risk: string | null }) => taskProgressApi.appendLocal(taskId, progress, note, risk),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(taskId) }),
  });
}
