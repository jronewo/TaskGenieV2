import { apiClient } from "../../../core/api/client";
import { AddTeamMemberRequest, CreateTeamRequest, TeamDto } from "../types";

export const teamsApi = {
  my: () => apiClient.get<TeamDto[]>("/Teams/my"),
  all: () => apiClient.get<TeamDto[]>("/Teams"),
  get: (id: number) => apiClient.get<TeamDto>(`/Teams/${id}`),
  create: (body: CreateTeamRequest) => apiClient.post<TeamDto>("/Teams", body),
  addMember: (id: number, body: AddTeamMemberRequest) => apiClient.post<void>(`/Teams/${id}/members`, body),
  removeMember: (memberId: number) => apiClient.delete<void>(`/Teams/members/${memberId}`),
  remove: (id: number) => apiClient.delete<void>(`/Teams/${id}`),
};
