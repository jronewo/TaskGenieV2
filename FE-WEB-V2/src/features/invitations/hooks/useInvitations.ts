import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invitationsApi } from "../api/invitationsApi";
import { CreateInvitationRequest, UpdateInvitationStatusRequest } from "../types";

const byTeamKey = (teamId: number) => ["invitations", "team", teamId] as const;
const byEmailKey = (email: string) => ["invitations", "user", email] as const;

export function useTeamInvitations(teamId: number | null) {
  return useQuery({
    queryKey: teamId ? byTeamKey(teamId) : ["invitations", "team", "none"],
    queryFn: () => invitationsApi.byTeam(teamId as number),
    enabled: teamId !== null,
  });
}

export function useMyInvitations(email: string | null) {
  return useQuery({
    queryKey: email ? byEmailKey(email) : ["invitations", "user", "none"],
    queryFn: () => invitationsApi.byUserEmail(email as string),
    enabled: !!email,
  });
}

export function useCreateInvitation(teamId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInvitationRequest) => invitationsApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: byTeamKey(teamId) }),
  });
}

export function useUpdateInvitationStatus(email: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => invitationsApi.updateStatus(id, { status } as UpdateInvitationStatusRequest),
    onSuccess: () => {
      if (email) queryClient.invalidateQueries({ queryKey: byEmailKey(email) });
    },
  });
}

export function useDeleteInvitation(teamId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => invitationsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: byTeamKey(teamId) }),
  });
}
