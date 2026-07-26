import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { teamsApi } from "../api/teamsApi";
import { AddTeamMemberRequest, CreateTeamRequest } from "../types";

const teamsKey = ["teams"] as const;

export function useMyTeams() {
  return useQuery({ queryKey: teamsKey, queryFn: teamsApi.my });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTeamRequest) => teamsApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamsKey }),
  });
}

export function useAddTeamMember(teamId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddTeamMemberRequest) => teamsApi.addMember(teamId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamsKey }),
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) => teamsApi.removeMember(memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamsKey }),
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => teamsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamsKey }),
  });
}
