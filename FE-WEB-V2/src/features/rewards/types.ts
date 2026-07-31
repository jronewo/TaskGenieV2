export type ScoreType = "REWARD" | "PENALTY";

export interface UserScoreDto {
  id: number;
  userId: number;
  userName: string | null;
  taskId: number | null;
  taskTitle: string | null;
  projectId: number | null;
  projectName: string | null;
  type: ScoreType | string;
  amount: number;
  reason: string | null;
  createdAt: string;
}

export interface UserScoreSummaryDto {
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

export interface ProjectScoreLeaderboardDto {
  projectId: number;
  projectName: string | null;
  members: UserScoreSummaryDto[];
}

export interface ApplyManualScoreRequest {
  userId: number;
  type: ScoreType;
  amount: number;
  reason: string;
  taskId?: number;
  projectId?: number;
}
