export type TaskStatus = "Todo" | "InProgress" | "Done";

export interface TaskAssigneeDto {
  userId: number;
  userName: string | null;
  avatar: string | null;
}

export interface TaskDependencyDto {
  dependencyId: number;
  dependsOnTaskId: number;
  dependsOnTaskTitle: string | null;
  status: string | null;
}

export interface TaskDetailDto {
  taskId: number;
  projectId: number | null;
  title: string | null;
  description: string | null;
  status: TaskStatus | string | null;
  priority: string | null;
  deadline: string | null;
  estimatedTime: number | null;
  aiEstimatedTime: number | null;
  actualTime: number | null;
  progress: number | null;
  riskLevel: string | null;
  aiSummary: string | null;
  createdAt: string | null;
  completedAt: string | null;
  createdBy: number | null;
  isLate: boolean;
  daysLateOrEarly: number | null;
  assignees: TaskAssigneeDto[];
  dependencies: TaskDependencyDto[];
  requiredSkillIds: number[];
}

export interface CreateTaskRequest {
  projectId: number;
  title: string;
  description?: string;
  priority?: string;
  deadline?: string;
  difficulty?: number;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  deadline?: string;
  estimatedTime?: number;
  actualTime?: number;
  difficulty?: number;
}

export interface UpdateProgressRequest {
  status?: string;
  progress?: number;
  riskLevel?: string;
  actualTime?: number;
}
