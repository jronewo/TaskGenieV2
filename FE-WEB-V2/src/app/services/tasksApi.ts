import { apiRequest } from "./apiClient";

export interface TaskAssigneeDto {
  userId: number;
  userName: string;
  avatar: string | null;
}

export interface TaskDto {
  taskId: number;
  projectId: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string | null;
  estimatedTime: number | null;
  aiEstimatedTime: number | null;
  actualTime: number | null;
  progress: number;
  riskLevel: string;
  aiSummary: string | null;
  createdAt: string;
  completedAt: string | null;
  createdBy: number;
  isLate: boolean;
  daysLateOrEarly: number | null;
  assignees: TaskAssigneeDto[];
  dependencies: unknown[];
  requiredSkillIds: number[];
}

export const tasksApi = {
  listByProject: (projectId: number) => apiRequest<TaskDto[]>(`/Tasks?projectId=${projectId}`),
};
