import { api } from "../lib/apiClient";
import { mapTask, toBeStatus } from "../mappers";
import type { Task, TaskStatus, Priority } from "../app/data/tmaiData";
import type { TaskDetailDto } from "../types/api";

function toBePriority(priority: Priority): string {
  const map: Record<Priority, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "High",
  };
  return map[priority] ?? "Medium";
}

export async function fetchMyTasks(): Promise<Task[]> {
  const dtos = await api<TaskDetailDto[]>("/tasks/my");
  return dtos.map(mapTask);
}

export async function fetchTasksByProject(projectId: number): Promise<Task[]> {
  const dtos = await api<TaskDetailDto[]>(`/tasks?projectId=${projectId}`);
  return dtos.map(mapTask);
}

export async function createTask(params: {
  projectId: number;
  title: string;
  description?: string;
  priority?: Priority;
  deadline?: string;
}): Promise<Task> {
  const dto = await api<TaskDetailDto>("/tasks", {
    method: "POST",
    body: JSON.stringify({
      projectId: params.projectId,
      title: params.title,
      description: params.description ?? "",
      priority: params.priority ? toBePriority(params.priority) : "Medium",
      deadline: params.deadline || null,
      difficulty: null,
    }),
  });
  return mapTask(dto);
}

export async function updateTask(
  taskId: number,
  params: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: Priority;
    deadline?: string | null;
    progress?: number;
  }
): Promise<void> {
  await api(`/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify({
      title: params.title,
      description: params.description,
      status: params.status ? toBeStatus(params.status) : undefined,
      priority: params.priority ? toBePriority(params.priority) : undefined,
      deadline: params.deadline ?? undefined,
    }),
  });

  if (params.status !== undefined && params.progress !== undefined) {
    await updateTaskProgress(taskId, params.status, params.progress);
  } else if (params.status !== undefined) {
    await updateTaskProgress(taskId, params.status, statusToProgress(params.status));
  }
}

function statusToProgress(status: TaskStatus): number {
  if (status === "done") return 100;
  if (status === "in_progress" || status === "review") return 50;
  return 0;
}

export async function deleteTask(taskId: number): Promise<void> {
  await api(`/tasks/${taskId}`, { method: "DELETE" });
}

export async function updateTaskProgress(
  taskId: number,
  status: TaskStatus,
  progress: number,
  riskLevel = "LOW"
): Promise<void> {
  await api(`/tasks/${taskId}/progress`, {
    method: "PUT",
    body: JSON.stringify({
      status: toBeStatus(status),
      progress,
      riskLevel,
      actualTime: null,
    }),
  });
}

export async function assignTask(taskId: number, userId: number): Promise<void> {
  await api("/task-assignment/accept", {
    method: "POST",
    body: JSON.stringify({ taskId, userId }),
  });
}
