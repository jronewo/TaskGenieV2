// MOCK — see MOCK_API_TODO.md. The real PUT /api/task-progress/{taskId} is already covered
// by tasksApi.updateProgress (wired to the real /api/tasks/{id}/progress route by the team).
// This module only mocks the log-history read side: GET /api/task-progress/{taskId}/logs.
import { loadMockState, mockDelay, nextMockId, saveMockState } from "../../../core/api/mock";

export interface TaskLogDto {
  logId: number;
  taskId: number | null;
  progress: number | null;
  note: string | null;
  risk: string | null;
  createdAt: string | null;
}

let logsByTask = loadMockState<Record<number, TaskLogDto[]>>("tasks.progressLogs", {});

function persist() {
  saveMockState("tasks.progressLogs", logsByTask);
}

export const taskProgressApi = {
  logs: (taskId: number) => mockDelay(logsByTask[taskId] ?? []), // TODO: GET /task-progress/{taskId}/logs

  appendLocal: (taskId: number, progress: number, note: string | null, risk: string | null) => {
    const entry: TaskLogDto = {
      logId: nextMockId(logsByTask[taskId] ?? [], "logId"),
      taskId,
      progress,
      note,
      risk,
      createdAt: new Date().toISOString(),
    };
    logsByTask[taskId] = [entry, ...(logsByTask[taskId] ?? [])];
    persist();
    return mockDelay(entry);
  }, // mock-only convenience — real PUT /task-progress/{taskId} both updates the task and appends a log server-side
};
