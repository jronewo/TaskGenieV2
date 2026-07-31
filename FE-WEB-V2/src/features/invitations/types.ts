export type InvitationStatus = "Pending" | "Accepted" | "Rejected";

export interface InvitationDto {
  invitationId: number;
  teamId: number | null;
  teamName: string | null;
  email: string | null;
  status: InvitationStatus | string | null;
}

export interface CreateInvitationRequest {
  teamId: number;
  email: string;
}

export interface UpdateInvitationStatusRequest {
  status: InvitationStatus | string;
}
