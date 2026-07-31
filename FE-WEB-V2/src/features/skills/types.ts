export interface SkillDto {
  skillId: number;
  skillName: string;
}

export interface UserSkillDto {
  id: number;
  userId: number;
  userName: string | null;
  skillId: number;
  skillName: string | null;
  level: number | null;
}

export interface CreateSkillRequest {
  skillName: string;
}

export interface AddUserSkillRequest {
  userId: number;
  skillId: number;
  level: number;
}
