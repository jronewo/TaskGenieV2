export interface EvaluationDto {
  evaluationId: number;
  userId: number;
  userName: string | null;
  leaderId: number | null;
  leaderName: string | null;
  skillScore: number | null;
  teamworkScore: number | null;
  deadlineScore: number | null;
  communicationScore: number | null;
  createdAt: string | null;
}

export interface CreateEvaluationRequest {
  userId: number;
  leaderId: number;
  skillScore?: number;
  teamworkScore?: number;
  deadlineScore?: number;
  communicationScore?: number;
}
