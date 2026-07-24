import { apiRequest } from "./apiClient";

export interface TaskCommentDto {
  commentId: number;
  taskId: number;
  userId: number;
  userName: string | null;
  userAvatar: string | null;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export const taskCommentsApi = {
  listByTask: (taskId: number) => apiRequest<TaskCommentDto[]>(`/TaskComments/task/${taskId}`),

  create: (taskId: number, content: string) =>
    apiRequest<TaskCommentDto>("/TaskComments", { method: "POST", body: JSON.stringify({ taskId, content }) }),
};
