import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { evaluationsApi } from "../api/evaluationsApi";
import { CreateEvaluationRequest } from "../types";

const byUserKey = (userId: number) => ["evaluations", "user", userId] as const;
const byLeaderKey = (leaderId: number) => ["evaluations", "leader", leaderId] as const;

export function useEvaluationsReceived(userId: number | null) {
  return useQuery({
    queryKey: userId ? byUserKey(userId) : ["evaluations", "user", "none"],
    queryFn: () => evaluationsApi.byUser(userId as number),
    enabled: userId !== null,
  });
}

export function useEvaluationsGiven(leaderId: number | null) {
  return useQuery({
    queryKey: leaderId ? byLeaderKey(leaderId) : ["evaluations", "leader", "none"],
    queryFn: () => evaluationsApi.byLeader(leaderId as number),
    enabled: leaderId !== null,
  });
}

export function useCreateEvaluation(leaderId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateEvaluationRequest) => evaluationsApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: byLeaderKey(leaderId) }),
  });
}

export function useDeleteEvaluation(leaderId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => evaluationsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: byLeaderKey(leaderId) }),
  });
}
