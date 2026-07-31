import { apiRequest } from '../client';
import type { TaskComment } from '../types';

export const commentsApi = {
  getByTask: (taskId: number, signal?: AbortSignal) =>
    apiRequest<TaskComment[]>(`/api/taskcomments/task/${taskId}`, { signal }),

  create: (taskId: number, userId: number, content: string, imageUrl?: string | null) =>
    apiRequest<TaskComment>('/api/taskcomments', {
      method: 'POST',
      body: { taskId, userId, content, imageUrl: imageUrl ?? null },
    }),

  remove: (commentId: number) =>
    apiRequest<void>(`/api/taskcomments/${commentId}`, { method: 'DELETE' }),
};
