import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { organizationsApi } from "../api/organizationsApi";
import { EvaluateProjectRequest } from "../types";

const myOrgKey = ["organizations", "my"] as const;
const evaluationKey = (orgId: number, projectId: number) => ["organizations", orgId, "projects", projectId, "evaluation"] as const;

export function useMyOrganization() {
  return useQuery({ queryKey: myOrgKey, queryFn: organizationsApi.my });
}

export function useAdminOrganizations() {
  return useQuery({ queryKey: ["organizations", "admin-all"], queryFn: organizationsApi.adminAll });
}

export function useProjectEvaluation(orgId: number | null, projectId: number | null) {
  return useQuery({
    queryKey: orgId && projectId ? evaluationKey(orgId, projectId) : ["organizations", "evaluation", "none"],
    queryFn: () => organizationsApi.getEvaluation(orgId as number, projectId as number),
    enabled: orgId !== null && projectId !== null,
  });
}

export function useEvaluateProject(orgId: number, projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: EvaluateProjectRequest) => organizationsApi.evaluateProject(orgId, projectId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: evaluationKey(orgId, projectId) });
      queryClient.invalidateQueries({ queryKey: myOrgKey });
    },
  });
}
