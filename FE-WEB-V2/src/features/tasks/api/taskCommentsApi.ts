// MOCK — see MOCK_API_TODO.md. Function names/signatures match /api/taskcomments routes.
import { loadMockState, mockDelay, nextMockId, saveMockState } from "../../../core/api/mock";

export interface TaskCommentDto {
  commentId: number;
  taskId: number | null;
  userId: number | null;
  userName: string | null;
  userAvatar: string | null;
  content: string | null;
  imageUrl: string | null;
  createdAt: string | null;
}

export interface CreateTaskCommentRequest {
  taskId: number;
  userId: number;
  content?: string;
  imageUrl?: string;
}

let comments = loadMockState<TaskCommentDto[]>("tasks.comments", []);

function persist() {
  saveMockState("tasks.comments", comments);
}

export const taskCommentsApi = {
  byTask: (taskId: number) => mockDelay(comments.filter((c) => c.taskId === taskId)), // TODO: GET /taskcomments/task/{taskId}

  create: (body: CreateTaskCommentRequest, userName: string | null) => {
    const entry: TaskCommentDto = {
      commentId: nextMockId(comments, "commentId"),
      taskId: body.taskId,
      userId: body.userId,
      userName,
      userAvatar: null,
      content: body.content ?? null,
      imageUrl: body.imageUrl ?? null,
      createdAt: new Date().toISOString(),
    };
    comments = [...comments, entry];
    persist();
    return mockDelay(entry);
  }, // TODO: POST /taskcomments

  remove: (commentId: number) => {
    comments = comments.filter((c) => c.commentId !== commentId);
    persist();
    return mockDelay(undefined);
  }, // TODO: DELETE /taskcomments/{commentId}
};
