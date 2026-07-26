import { apiRequest } from '../client';
import type { RiskAssessment, TaskAssignmentRecommendation, WorkloadSuggestion } from '../types';

export const aiApi = {
  /** Runs the risk model for one task and persists a new assessment. */
  analyzeTaskRisk: (taskId: number) =>
    apiRequest<RiskAssessment | null>(`/api/ai-analysis/${taskId}/risk`, { method: 'POST' }),

  analyzeProjectRisks: (projectId: number) =>
    apiRequest<RiskAssessment[]>(`/api/ai-analysis/project/${projectId}/analyze-all`, {
      method: 'POST',
    }),

  /** Previously-computed assessments, newest first — no model call. */
  getRiskHistory: (taskId: number, signal?: AbortSignal) =>
    apiRequest<RiskAssessment[]>(`/api/ai-analysis/${taskId}/risk-history`, { signal }),

  getWorkloadSuggestions: (projectId: number, signal?: AbortSignal) =>
    apiRequest<WorkloadSuggestion>(`/api/ai-analysis/project/${projectId}/workload`, { signal }),

  generateSummary: (taskId: number) =>
    apiRequest<{ message: string }>(`/api/ai-analysis/${taskId}/summary`, { method: 'POST' }),

  recommendAssignees: (taskId: number, projectId: number) =>
    apiRequest<TaskAssignmentRecommendation>('/api/task-assignment/recommend', {
      method: 'POST',
      body: { taskId, projectId },
    }),

  acceptRecommendation: (taskId: number, userId: number, outcome?: string) =>
    apiRequest<{ message: string }>('/api/task-assignment/accept', {
      method: 'POST',
      body: { taskId, userId, outcome: outcome ?? null },
    }),
};
