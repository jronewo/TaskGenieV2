// MOCK — see MOCK_API_TODO.md. Function names/signatures match /api/taskrequiredskills routes.
import { loadMockState, mockDelay, saveMockState } from "../../../core/api/mock";
import { SkillDto } from "../../skills/types";

export interface TaskRequiredSkillDto {
  id: number;
  skillId: number;
  skillName: string | null;
}

let requiredSkillsByTask = loadMockState<Record<number, TaskRequiredSkillDto[]>>("tasks.requiredSkills", {});

function persist() {
  saveMockState("tasks.requiredSkills", requiredSkillsByTask);
}

export const taskRequiredSkillsApi = {
  byTask: (taskId: number) => mockDelay(requiredSkillsByTask[taskId] ?? []), // TODO: GET /taskrequiredskills/{taskId}

  set: (taskId: number, skillIds: number[], catalog: SkillDto[]) => {
    requiredSkillsByTask[taskId] = skillIds.map((skillId, i) => ({
      id: i + 1,
      skillId,
      skillName: catalog.find((s) => s.skillId === skillId)?.skillName ?? null,
    }));
    persist();
    return mockDelay({ message: "Required skills updated." });
  }, // TODO: POST /taskrequiredskills/{taskId} (Body: { skillIds })
};
