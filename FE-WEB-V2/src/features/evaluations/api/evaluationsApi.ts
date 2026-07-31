import { apiClient } from "../../../core/api/client";
import { CreateEvaluationRequest, EvaluationDto } from "../types";

export const evaluationsApi = {
  get: (id: number) => apiClient.get<EvaluationDto>(`/Evaluations/${id}`),
  byUser: (userId: number) => apiClient.get<EvaluationDto[]>(`/Evaluations/user/${userId}`),
  byLeader: (leaderId: number) => apiClient.get<EvaluationDto[]>(`/Evaluations/leader/${leaderId}`),
  create: (body: CreateEvaluationRequest) => apiClient.post<EvaluationDto>("/Evaluations", body),
  remove: (id: number) => apiClient.delete<void>(`/Evaluations/${id}`),
};
