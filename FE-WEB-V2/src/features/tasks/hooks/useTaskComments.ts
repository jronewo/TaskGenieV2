import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskCommentsApi, CreateTaskCommentRequest } from "../api/taskCommentsApi";

const commentsKey = (taskId: number) => ["tasks", taskId, "comments"] as const;

export function useTaskComments(taskId: number | null) {
  return useQuery({
    queryKey: taskId ? commentsKey(taskId) : ["tasks", "none", "comments"],
    queryFn: () => taskCommentsApi.byTask(taskId as number),
    enabled: taskId !== null,
  });
}

export function useCreateTaskComment(taskId: number, userName: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTaskCommentRequest) => taskCommentsApi.create(body, userName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentsKey(taskId) }),
  });
}

export function useDeleteTaskComment(taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => taskCommentsApi.remove(commentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentsKey(taskId) }),
  });
}
