export interface ProjectDto {
  projectId: number;
  name: string;
  description?: string | null;
  status?: string | null;
  deadline?: string | null;
  progress: number;
  riskLevel: string;
  organizationId?: number | null;
  organizationName?: string | null;
  teamId?: number | null;
  canManageTasks?: boolean;
  taskCount?: number;
  completedTaskCount?: number;
}

export interface TaskAssignee {
  userId: number;
  userName?: string | null;
  avatar?: string | null;
}

export interface TaskDto {
  taskId: number;
  projectId?: number | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  deadline?: string | null;
  progress?: number | null;
  riskLevel?: string | null;
  difficulty?: number | null;
  estimatedTime?: number | null;
  aiEstimatedTime?: number | null;
  taskTypeName?: string | null;
  taskTypeColor?: string | null;
  assignees: TaskAssignee[];
}

export interface CommentDto {
  commentId: number;
  taskId: number;
  userId: number;
  userName?: string | null;
  userAvatar?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  createdAt?: string | null;
}

export interface NotificationDto {
  notificationId: number;
  type: string | null;
  title: string | null;
  message: string | null;
  referenceId: number | null;
  referenceType: string | null;
  projectId?: number | null;
  projectName?: string | null;
  imageUrl?: string | null;
  isRead: boolean | null;
  createdAt: string | null;
}

export interface TeamMemberDto {
  teamMemberId: number;
  userId?: number | null;
  userName?: string | null;
  avatar?: string | null;
  role?: string | null;
}

export interface PlanDto {
  planId: number;
  code: string;
  name: string;
  description?: string | null;
  audience?: string | null;
  /** Integer minor units — the API never sends money as a float. */
  priceMinor?: number;
  currency?: string | null;
  projectLimit?: number | null;
  memberLimit?: number | null;
}

export interface EntitlementDto {
  planCode: string;
  planName: string;
  isPremium: boolean;
  projectLimit: number | null;
  projectUsage: number;
  memberLimit: number | null;
  sources: string[];
}

export interface SubscriptionDto {
  subscriptionId: number;
  planId: number;
  status?: string | null;
  currentPeriodEnd?: string | null;
}

export interface PaymentDto {
  paymentTransactionId: number;
  amountMinor?: number;
  currency?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

export interface SkillDto {
  skillId: number;
  skillName: string;
}

export interface MySkillDto {
  id: number;
  userId: number;
  skillId: number;
  skillName: string | null;
  /** 1–5; the assignment score weights skill match at 40%, so the level matters. */
  level: number | null;
}
