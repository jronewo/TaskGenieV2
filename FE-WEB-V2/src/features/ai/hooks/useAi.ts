import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "../api/aiApi";

const riskHistoryKey = (taskId: number) => ["ai", "risk-history", taskId] as const;
const evidenceKey = (taskId: number) => ["ai", "evidence", taskId] as const;
const assignmentHistoryKey = (taskId: number) => ["ai", "assignment-history", taskId] as const;
const executionsKey = (taskId: number) => ["ai", "executions", taskId] as const;
const analysesKey = (taskId: number) => ["ai", "analyses", taskId] as const;

export function useRiskHistory(taskId: number | null) {
  return useQuery({
    queryKey: taskId ? riskHistoryKey(taskId) : ["ai", "risk-history", "none"],
    queryFn: () => aiApi.getRiskHistory(taskId as number),
    enabled: taskId !== null,
  });
}

export function useAnalyzeRisk(taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => aiApi.analyzeRisk(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: riskHistoryKey(taskId) });
      queryClient.invalidateQueries({ queryKey: executionsKey(taskId) });
    },
  });
}

export function useAnalyzeAllProject() {
  return useMutation({ mutationFn: (projectId: number) => aiApi.analyzeAllProject(projectId) });
}

export function useProjectWorkload(projectId: number | null) {
  return useQuery({
    queryKey: projectId ? (["ai", "workload", projectId] as const) : (["ai", "workload", "none"] as const),
    queryFn: () => aiApi.getProjectWorkload(projectId as number),
    enabled: projectId !== null,
  });
}

export function useRecommend(taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: number) => aiApi.recommend(taskId, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentHistoryKey(taskId) });
      queryClient.invalidateQueries({ queryKey: executionsKey(taskId) });
    },
  });
}

export function useAcceptRecommendation(taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (candidateId: number) => aiApi.acceptRecommendation(taskId, candidateId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assignmentHistoryKey(taskId) }),
  });
}

export function useRejectRecommendation(taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (candidateId: number) => aiApi.rejectRecommendation(taskId, candidateId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assignmentHistoryKey(taskId) }),
  });
}

export function useAssignmentHistory(taskId: number | null) {
  return useQuery({
    queryKey: taskId ? assignmentHistoryKey(taskId) : ["ai", "assignment-history", "none"],
    queryFn: () => aiApi.getAssignmentHistory(taskId as number),
    enabled: taskId !== null,
  });
}

export function useTaskExecutions(taskId: number | null) {
  return useQuery({
    queryKey: taskId ? executionsKey(taskId) : ["ai", "executions", "none"],
    queryFn: () => aiApi.getTaskExecutions(taskId as number),
    enabled: taskId !== null,
  });
}

export function useTaskAnalyses(taskId: number | null) {
  return useQuery({
    queryKey: taskId ? analysesKey(taskId) : ["ai", "analyses", "none"],
    queryFn: () => aiApi.getTaskAnalyses(taskId as number),
    enabled: taskId !== null,
  });
}

export function useSummarizeTask(taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => aiApi.summarizeTask(taskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: analysesKey(taskId) }),
  });
}

export function useClassifyTask(taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => aiApi.classifyTask(taskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: analysesKey(taskId) }),
  });
}

export function useTaskEvidence(taskId: number | null) {
  return useQuery({
    queryKey: taskId ? evidenceKey(taskId) : ["ai", "evidence", "none"],
    queryFn: () => aiApi.getEvidence(taskId as number),
    enabled: taskId !== null,
  });
}

export function useAddUrlEvidence(taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ externalUrl, description }: { externalUrl: string; description: string }) => aiApi.addUrlEvidence(taskId, externalUrl, description),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: evidenceKey(taskId) }),
  });
}
