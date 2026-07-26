export type ProjectRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ProjectDto {
  projectId: number;
  createdBy: number | null;
  name: string;
  description: string | null;
  status: string | null;
  organizationId: number | null;
  organizationName: string | null;
  teamId: number | null;
  teamName: string | null;
  deadline: string | null;
  progress: number;
  predictedEndDate: string | null;
  riskLevel: ProjectRiskLevel | string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  createdBy: number;
  organizationId?: number;
  deadline?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: string;
  teamId?: number;
  deadline?: string;
}

export interface AddProjectMemberRequest {
  email: string;
  role: string;
}

export interface ProjectMemberScoreDto {
  userId: number;
  userName: string | null;
  avatar: string | null;
  level: string;
  taskScore: number;
  closureScore: number;
  totalProjectScore: number;
}

export interface ProjectSummaryDto {
  projectId: number;
  projectName: string | null;
  deadline: string | null;
  closedAt: string;
  projectCompletionStatus: "Early" | "OnTime" | "Late" | string;
  daysVsDeadline: number;
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  onTimeTaskRate: number;
  projectClosureScorePerMember: number;
  projectClosureScoreType: "REWARD" | "PENALTY" | string;
  memberScores: ProjectMemberScoreDto[];
}
