/**
 * Mirrors the DTOs in src/TaskGenie.Application/Features/**. ASP.NET Core
 * serialises with camelCase by default, so property names match one-to-one.
 *
 * `DateOnly` fields arrive as "2026-05-27"; `DateTime` fields as full ISO 8601.
 */

export type TaskStatus = 'Todo' | 'InProgress' | 'Done';
export type TaskPriority = 'High' | 'Medium' | 'Low';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  userId: number;
  name: string | null;
  email: string | null;
  role: string;
  isFirstLogin: boolean;
  isOrgOwner: boolean;
  accessToken: string;
  expiresAtUtc: string;
  message: string;
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export interface TaskAssignee {
  userId: number;
  userName: string | null;
  avatar: string | null;
}

export interface TaskDependency {
  dependencyId: number;
  dependsOnTaskId: number;
  dependsOnTaskTitle: string | null;
  status: string | null;
}

export interface TaskDetail {
  taskId: number;
  projectId: number | null;
  title: string | null;
  description: string | null;
  status: string | null;
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
  assignees: TaskAssignee[];
  dependencies: TaskDependency[];
  requiredSkillIds: number[];
}

export interface CreateTaskPayload {
  projectId: number;
  title: string;
  description?: string | null;
  priority?: string | null;
  deadline?: string | null;
  difficulty?: number | null;
}

export interface UpdateTaskPayload {
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  deadline?: string | null;
  estimatedTime?: number | null;
  actualTime?: number | null;
  difficulty?: number | null;
}

export interface UpdateProgressPayload {
  status?: string | null;
  progress?: number | null;
  riskLevel?: string | null;
  actualTime?: number | null;
}

// ── Projects ─────────────────────────────────────────────────────────────────

export interface Project {
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
  riskLevel: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProjectMemberScore {
  userId: number;
  userName: string | null;
  avatar: string | null;
  level: string;
  taskScore: number;
  closureScore: number;
  totalProjectScore: number;
}

export interface ProjectSummary {
  projectId: number;
  projectName: string | null;
  deadline: string | null;
  closedAt: string;
  projectCompletionStatus: 'Early' | 'OnTime' | 'Late';
  daysVsDeadline: number;
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  onTimeTaskRate: number;
  projectClosureScorePerMember: number;
  projectClosureScoreType: 'REWARD' | 'PENALTY';
  memberScores: ProjectMemberScore[];
}

// ── Teams ────────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  role: string | null;
}

export interface Team {
  teamId: number;
  name: string;
  description: string | null;
  createdBy: number | null;
  creatorName: string | null;
  members: TeamMember[];
}

// ── Users ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  userId: number;
  name: string | null;
  email: string | null;
  avatar: string | null;
  role: string | null;
  createdAt: string | null;
}

export interface UserSearchResult {
  userId: number;
  name: string;
  email: string;
  avatar: string | null;
}

// ── Notifications ────────────────────────────────────────────────────────────

export interface AppNotification {
  notificationId: number;
  userId: number | null;
  type: string | null;
  title: string | null;
  message: string | null;
  referenceId: number | null;
  referenceType: string | null;
  isRead: boolean;
  createdAt: string | null;
}

// ── Comments ─────────────────────────────────────────────────────────────────

export interface TaskComment {
  commentId: number;
  taskId: number | null;
  userId: number | null;
  userName: string | null;
  userAvatar: string | null;
  content: string | null;
  imageUrl: string | null;
  createdAt: string | null;
}

// ── AI ───────────────────────────────────────────────────────────────────────

export interface RiskFactor {
  code: string;
  rawValue: string;
  score: number;
  weight: number;
  contribution: number;
  evidence: string | null;
}

export interface RiskAssessment {
  runId: string;
  taskId: number;
  projectId: number | null;
  totalScore: number;
  riskLevel: string;
  ruleVersion: string;
  calculationMode: string;
  explanation: string;
  mitigationActions: string[];
  factors: RiskFactor[];
  createdAt: string;
}

export interface WorkloadSuggestionItem {
  userId: number;
  userName: string;
  suggestedTasks: string[];
  reason: string;
}

export interface WorkloadSuggestion {
  projectId: number;
  suggestions: WorkloadSuggestionItem[];
  generatedAt: string;
}

export interface AiSuggestionResult {
  rank: number;
  userId: number;
  userName: string;
  score: number;
  reason: string;
  skillMatchScore: number;
  semanticSimilarityScore: number;
  workloadScore: number;
  performanceScore: number;
  status: string;
}

export interface TaskAssignmentRecommendation {
  runId: string;
  taskId: number;
  taskTitle: string | null;
  requiredSkills: { skillId: number; skillName: string; requiredLevel: number }[];
  suggestions: AiSuggestionResult[];
  generatedAt: string;
  modelVersion: string;
  providerStatus: string;
}

// ── Scores ───────────────────────────────────────────────────────────────────

export interface UserScoreSummary {
  userId: number;
  userName: string | null;
  avatar: string | null;
  totalScore: number;
  totalRewardPoints: number;
  totalPenaltyPoints: number;
  level: string;
  levelMinScore: number;
  levelMaxScore: number;
  progressToNextLevel: number;
}

export interface ProjectScoreLeaderboard {
  projectId: number;
  projectName: string | null;
  members: UserScoreSummary[];
}
