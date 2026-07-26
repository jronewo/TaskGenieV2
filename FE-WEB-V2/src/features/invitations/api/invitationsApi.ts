// MOCK — see MOCK_API_TODO.md. Function names/signatures match /api/invitations routes.
import { loadMockState, mockDelay, nextMockId, saveMockState } from "../../../core/api/mock";
import { CreateInvitationRequest, InvitationDto, UpdateInvitationStatusRequest } from "../types";

let invitations = loadMockState<InvitationDto[]>("invitations", [
  { invitationId: 1, teamId: 1, teamName: "Platform Core", email: "anlequoc131@gmail.com", status: "Pending" },
  { invitationId: 2, teamId: 2, teamName: "AI Research", email: "teammate@taskgenie.dev", status: "Accepted" },
]);

function persist() {
  saveMockState("invitations", invitations);
}

export const invitationsApi = {
  get: (id: number) => mockDelay(invitations.find((i) => i.invitationId === id) ?? null), // TODO: GET /invitations/{id}

  byTeam: (teamId: number) => mockDelay(invitations.filter((i) => i.teamId === teamId)), // TODO: GET /invitations/team/{teamId}

  byUserEmail: (email: string) => mockDelay(invitations.filter((i) => (i.email ?? "").toLowerCase() === email.toLowerCase())), // TODO: GET /invitations/user/{email}

  create: (body: CreateInvitationRequest) => {
    const entry: InvitationDto = {
      invitationId: nextMockId(invitations, "invitationId"),
      teamId: body.teamId,
      teamName: null,
      email: body.email,
      status: "Pending",
    };
    invitations = [entry, ...invitations];
    persist();
    return mockDelay(entry);
  }, // TODO: POST /invitations

  updateStatus: (id: number, body: UpdateInvitationStatusRequest) => {
    invitations = invitations.map((i) => (i.invitationId === id ? { ...i, status: body.status } : i));
    persist();
    return mockDelay(undefined);
  }, // TODO: PUT /invitations/{id}/status

  remove: (id: number) => {
    invitations = invitations.filter((i) => i.invitationId !== id);
    persist();
    return mockDelay(undefined);
  }, // TODO: DELETE /invitations/{id}
};
