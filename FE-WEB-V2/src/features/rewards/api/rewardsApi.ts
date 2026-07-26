// MOCK — see MOCK_API_TODO.md. Function names/signatures match /api/user-scores routes.
import { loadMockState, mockDelay, nextMockId, saveMockState } from "../../../core/api/mock";
import { ApplyManualScoreRequest, ProjectScoreLeaderboardDto, UserScoreDto, UserScoreSummaryDto } from "../types";

let history = loadMockState<UserScoreDto[]>("rewards.history", [
  { id: 1, userId: 1, userName: "Alex Nguyen", taskId: 12, taskTitle: "Design DB schema", projectId: 1, projectName: "TaskGenie Web Revamp", type: "REWARD", amount: 15, reason: "Completed ahead of deadline", createdAt: "2026-07-01T00:00:00Z" },
  { id: 2, userId: 1, userName: "Alex Nguyen", taskId: 18, taskTitle: "Fix flaky CI pipeline", projectId: 1, projectName: "TaskGenie Web Revamp", type: "PENALTY", amount: -5, reason: "Missed deadline by 2 days", createdAt: "2026-07-10T00:00:00Z" },
  { id: 3, userId: 2, userName: "Bao Le", taskId: 20, taskTitle: "Risk scoring rules", projectId: 2, projectName: "AI Risk Engine", type: "REWARD", amount: 20, reason: "High quality, thorough test coverage", createdAt: "2026-07-12T00:00:00Z" },
]);

function persist() {
  saveMockState("rewards.history", history);
}

const LEVELS = [
  { name: "Bronze", min: 0, max: 99 },
  { name: "Silver", min: 100, max: 249 },
  { name: "Gold", min: 250, max: 499 },
  { name: "Platinum", min: 500, max: Infinity },
];

function levelFor(totalScore: number) {
  return LEVELS.find((l) => totalScore >= l.min && totalScore <= l.max) ?? LEVELS[0];
}

function summaryFor(userId: number, userName: string | null): UserScoreSummaryDto {
  const entries = history.filter((h) => h.userId === userId);
  const totalRewardPoints = entries.filter((h) => h.amount > 0).reduce((sum, h) => sum + h.amount, 0);
  const totalPenaltyPoints = entries.filter((h) => h.amount < 0).reduce((sum, h) => sum + Math.abs(h.amount), 0);
  const totalScore = totalRewardPoints - totalPenaltyPoints;
  const level = levelFor(totalScore);
  const span = level.max === Infinity ? 100 : level.max - level.min + 1;
  const progressToNextLevel = level.max === Infinity ? 100 : Math.round(((totalScore - level.min) / span) * 100);
  return {
    userId,
    userName,
    avatar: null,
    totalScore,
    totalRewardPoints,
    totalPenaltyPoints,
    level: level.name,
    levelMinScore: level.min,
    levelMaxScore: level.max === Infinity ? level.min + 999 : level.max,
    progressToNextLevel,
  };
}

const projectRoster: Record<number, { userId: number; userName: string }[]> = {
  1: [
    { userId: 1, userName: "Alex Nguyen" },
    { userId: 2, userName: "Bao Le" },
    { userId: 3, userName: "Chi Pham" },
  ],
  2: [
    { userId: 2, userName: "Bao Le" },
    { userId: 4, userName: "Minh Tran" },
  ],
};

export const rewardsApi = {
  history: (userId: number) => mockDelay(history.filter((h) => h.userId === userId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))), // TODO: GET /user-scores/user/{userId}

  summary: (userId: number, userName: string | null = null) => mockDelay(summaryFor(userId, userName)), // TODO: GET /user-scores/user/{userId}/summary

  leaderboard: (projectId: number) => {
    const roster = projectRoster[projectId] ?? [];
    const members = roster.map((r) => summaryFor(r.userId, r.userName)).sort((a, b) => b.totalScore - a.totalScore);
    const result: ProjectScoreLeaderboardDto = { projectId, projectName: null, members };
    return mockDelay(result);
  }, // TODO: GET /user-scores/project/{projectId}/leaderboard

  manualAdjust: (body: ApplyManualScoreRequest) => {
    const entry: UserScoreDto = {
      id: nextMockId(history, "id"),
      userId: body.userId,
      userName: null,
      taskId: body.taskId ?? null,
      taskTitle: null,
      projectId: body.projectId ?? null,
      projectName: null,
      type: body.type,
      amount: body.type === "PENALTY" ? -Math.abs(body.amount) : Math.abs(body.amount),
      reason: body.reason,
      createdAt: new Date().toISOString(),
    };
    history = [entry, ...history];
    persist();
    return mockDelay(entry);
  }, // TODO: POST /user-scores/manual
};
