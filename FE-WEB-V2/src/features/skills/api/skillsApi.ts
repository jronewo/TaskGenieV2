// MOCK — see MOCK_API_TODO.md. Function names/signatures match /api/skills routes.
import { loadMockState, mockDelay, nextMockId, saveMockState } from "../../../core/api/mock";
import { AddUserSkillRequest, CreateSkillRequest, SkillDto, UserSkillDto } from "../types";

let skills = loadMockState<SkillDto[]>("skills.catalog", [
  { skillId: 1, skillName: "React" },
  { skillId: 2, skillName: ".NET / C#" },
  { skillId: 3, skillName: "SQL Server" },
  { skillId: 4, skillName: "UI/UX Design" },
  { skillId: 5, skillName: "Machine Learning" },
  { skillId: 6, skillName: "DevOps" },
]);

let userSkills = loadMockState<UserSkillDto[]>("skills.user", [
  { id: 1, userId: 1, userName: "Alex Nguyen", skillId: 1, skillName: "React", level: 4 },
  { id: 2, userId: 1, userName: "Alex Nguyen", skillId: 2, skillName: ".NET / C#", level: 3 },
]);

function persistSkills() {
  saveMockState("skills.catalog", skills);
}
function persistUserSkills() {
  saveMockState("skills.user", userSkills);
}

export const skillsApi = {
  list: () => mockDelay(skills), // TODO: GET /skills

  get: (id: number) => mockDelay(skills.find((s) => s.skillId === id) ?? null), // TODO: GET /skills/{id}

  create: (body: CreateSkillRequest) => {
    const entry: SkillDto = { skillId: nextMockId(skills, "skillId"), skillName: body.skillName };
    skills = [...skills, entry];
    persistSkills();
    return mockDelay(entry);
  }, // TODO: POST /skills

  userSkills: (userId: number) => mockDelay(userSkills.filter((s) => s.userId === userId)), // TODO: GET /skills/user/{userId}

  addUserSkill: (body: AddUserSkillRequest) => {
    const skill = skills.find((s) => s.skillId === body.skillId);
    const entry: UserSkillDto = {
      id: nextMockId(userSkills, "id"),
      userId: body.userId,
      userName: null,
      skillId: body.skillId,
      skillName: skill?.skillName ?? null,
      level: body.level,
    };
    userSkills = [...userSkills, entry];
    persistUserSkills();
    return mockDelay({ message: "Skill added." });
  }, // TODO: POST /skills/user

  updateUserSkill: (userSkillId: number, level: number) => {
    userSkills = userSkills.map((s) => (s.id === userSkillId ? { ...s, level } : s));
    persistUserSkills();
    return mockDelay(undefined);
  }, // TODO: PUT /skills/user/{userSkillId}

  removeUserSkill: (userSkillId: number) => {
    userSkills = userSkills.filter((s) => s.id !== userSkillId);
    persistUserSkills();
    return mockDelay(undefined);
  }, // TODO: DELETE /skills/user/{userSkillId}
};
