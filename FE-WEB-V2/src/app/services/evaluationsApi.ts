import { apiRequest } from "./apiClient";

export interface EvaluationDto {
  evaluationId: number;
  userId: number;
  userName: string | null;
  leaderId: number;
  leaderName: string | null;
  skillScore: number | null;
  teamworkScore: number | null;
  deadlineScore: number | null;
  communicationScore: number | null;
  createdAt: string;
}

export interface CreateEvaluationInput {
  userId: number;
  leaderId: number;
  skillScore: number;
  teamworkScore: number;
  deadlineScore: number;
  communicationScore: number;
}

export const evaluationsApi = {
  listForUser: (userId: number) => apiRequest<EvaluationDto[]>(`/Evaluations/user/${userId}`),

  listByLeader: (leaderId: number) => apiRequest<EvaluationDto[]>(`/Evaluations/leader/${leaderId}`),

  create: (input: CreateEvaluationInput) =>
    apiRequest<EvaluationDto>("/Evaluations", { method: "POST", body: JSON.stringify(input) }),

  remove: (id: number) => apiRequest<void>(`/Evaluations/${id}`, { method: "DELETE" }),
};
