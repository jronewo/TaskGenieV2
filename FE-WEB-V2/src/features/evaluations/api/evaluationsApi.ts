// MOCK — see MOCK_API_TODO.md. Function names/signatures match /api/evaluations routes.
import { loadMockState, mockDelay, nextMockId, saveMockState } from "../../../core/api/mock";
import { CreateEvaluationRequest, EvaluationDto } from "../types";

let evaluations = loadMockState<EvaluationDto[]>("evaluations", [
  {
    evaluationId: 1,
    userId: 1,
    userName: "Alex Nguyen",
    leaderId: 2,
    leaderName: "Bao Le",
    skillScore: 4.5,
    teamworkScore: 4,
    deadlineScore: 3.5,
    communicationScore: 4.5,
    createdAt: "2026-06-30T00:00:00Z",
  },
]);

function persist() {
  saveMockState("evaluations", evaluations);
}

export const evaluationsApi = {
  get: (id: number) => mockDelay(evaluations.find((e) => e.evaluationId === id) ?? null), // TODO: GET /evaluations/{id}

  byUser: (userId: number) => mockDelay(evaluations.filter((e) => e.userId === userId)), // TODO: GET /evaluations/user/{userId}

  byLeader: (leaderId: number) => mockDelay(evaluations.filter((e) => e.leaderId === leaderId)), // TODO: GET /evaluations/leader/{leaderId}

  create: (body: CreateEvaluationRequest) => {
    const entry: EvaluationDto = {
      evaluationId: nextMockId(evaluations, "evaluationId"),
      userId: body.userId,
      userName: null,
      leaderId: body.leaderId,
      leaderName: null,
      skillScore: body.skillScore ?? null,
      teamworkScore: body.teamworkScore ?? null,
      deadlineScore: body.deadlineScore ?? null,
      communicationScore: body.communicationScore ?? null,
      createdAt: new Date().toISOString(),
    };
    evaluations = [entry, ...evaluations];
    persist();
    return mockDelay(entry);
  }, // TODO: POST /evaluations

  remove: (id: number) => {
    evaluations = evaluations.filter((e) => e.evaluationId !== id);
    persist();
    return mockDelay(undefined);
  }, // TODO: DELETE /evaluations/{id}
};
