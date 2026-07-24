import { apiRequest } from "./apiClient";

export interface TeamMemberDto {
  id: number;
  teamId: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  role: string | null;
}

export interface TeamDto {
  teamId: number;
  name: string;
  description: string | null;
  createdBy: number | null;
  creatorName: string | null;
  members: TeamMemberDto[];
}

export const teamsApi = {
  listMine: () => apiRequest<TeamDto[]>("/Teams/my"),

  getById: (id: number) => apiRequest<TeamDto>(`/Teams/${id}`),

  create: (input: { name: string; description?: string; createdBy: number }) =>
    apiRequest<TeamDto>("/Teams", { method: "POST", body: JSON.stringify(input) }),

  addMember: (teamId: number, input: { userId: number; role: string }) =>
    apiRequest<{ message: string }>(`/Teams/${teamId}/members`, { method: "POST", body: JSON.stringify(input) }),

  removeMember: (memberId: number) =>
    apiRequest<void>(`/Teams/members/${memberId}`, { method: "DELETE" }),

  remove: (teamId: number) => apiRequest<void>(`/Teams/${teamId}`, { method: "DELETE" }),
};
