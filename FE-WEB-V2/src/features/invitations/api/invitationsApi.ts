import { apiClient } from "../../../core/api/client";
import { CreateInvitationRequest, InvitationDto, UpdateInvitationStatusRequest } from "../types";

export const invitationsApi = {
  get: (id: number) => apiClient.get<InvitationDto>(`/Invitations/${id}`),
  byTeam: (teamId: number) => apiClient.get<InvitationDto[]>(`/Invitations/team/${teamId}`),
  byUserEmail: (email: string) => apiClient.get<InvitationDto[]>(`/Invitations/user/${encodeURIComponent(email)}`),
  create: (body: CreateInvitationRequest) => apiClient.post<InvitationDto>("/Invitations", body),
  updateStatus: (id: number, body: UpdateInvitationStatusRequest) => apiClient.put<void>(`/Invitations/${id}/status`, body),
  remove: (id: number) => apiClient.delete<void>(`/Invitations/${id}`),
};
