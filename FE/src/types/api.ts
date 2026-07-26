export interface AuthResponse {
  userId: number;
  name: string | null;
  email: string | null;
  role: string;
  isFirstLogin: boolean;
  isOrgOwner: boolean;
  accessToken: string;
  expiresAtUtc: string;
  message?: string;
}

export interface AuthUser {
  userId: number;
  name: string | null;
  email: string | null;
  role: string;
  isFirstLogin: boolean;
  isOrgOwner: boolean;
  accessToken: string;
  expiresAtUtc: string;
}

export interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

export type ProjectTeamRole = "LEADER" | "MEMBER";

export interface ProjectDto {
  projectId: number;
  createdBy?: number | null;
  name: string;
  description?: string | null;
  status?: string | null;
  organizationId?: number | null;
  organizationName?: string | null;
  teamId?: number | null;
  teamName?: string | null;
  deadline?: string | null;
  progress: number;
  predictedEndDate?: string | null;
  riskLevel: string;
  projectType: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TeamMemberDto {
  id: number;
  teamId: number;
  userId: number;
  userName?: string | null;
  userEmail?: string | null;
  role?: string | null;
}

export interface TeamDto {
  teamId: number;
  name: string;
  description?: string | null;
  createdBy?: number | null;
  creatorName?: string | null;
  members: TeamMemberDto[];
}

export interface TaskAssigneeDto {
  userId: number;
  userName?: string | null;
  avatar?: string | null;
}

export interface TaskDetailDto {
  taskId: number;
  projectId?: number | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  deadline?: string | null;
  estimatedTime?: number | null;
  aiEstimatedTime?: number | null;
  actualTime?: number | null;
  progress?: number | null;
  riskLevel?: string | null;
  aiSummary?: string | null;
  createdAt?: string | null;
  createdBy?: number | null;
  assignees: TaskAssigneeDto[];
}

export interface InvitationDto {
  invitationId: number;
  teamId?: number | null;
  teamName?: string | null;
  email?: string | null;
  status?: string | null;
}

export interface NotificationDto {
  notificationId: number;
  userId?: number | null;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  referenceId?: number | null;
  referenceType?: string | null;
  isRead: boolean;
  createdAt?: string | null;
}
