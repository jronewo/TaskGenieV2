import { api } from "../lib/apiClient";
import type { InvitationDto } from "../types/api";

export async function fetchUserInvitations(email: string): Promise<InvitationDto[]> {
  const encoded = encodeURIComponent(email);
  return api<InvitationDto[]>(`/invitations/user/${encoded}`);
}

export async function acceptInvitation(invitationId: number): Promise<void> {
  await api(`/invitations/${invitationId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status: "Accepted" }),
  });
}

export async function declineInvitation(invitationId: number): Promise<void> {
  await api(`/invitations/${invitationId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status: "Declined" }),
  });
}
