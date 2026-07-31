import { apiClient } from "../../../core/api/client";
import { AddUserSkillRequest, CreateSkillRequest, SkillDto, UserSkillDto } from "../types";

export const skillsApi = {
  list: () => apiClient.get<SkillDto[]>("/Skills"),
  get: (id: number) => apiClient.get<SkillDto>(`/Skills/${id}`),
  create: (body: CreateSkillRequest) => apiClient.post<SkillDto>("/Skills", body),
  userSkills: (userId: number) => apiClient.get<UserSkillDto[]>(`/Skills/user/${userId}`),
  addUserSkill: (body: AddUserSkillRequest) => apiClient.post<{ message: string }>("/Skills/user", body),
  updateUserSkill: (userSkillId: number, level: number) => apiClient.put<void>(`/Skills/user/${userSkillId}`, level),
  removeUserSkill: (userSkillId: number) => apiClient.delete<void>(`/Skills/user/${userSkillId}`),
};
