export interface TeamMemberDto {
  id: number;
  teamId: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  role: string | null;
}

export interface TeamDto {
  teamId: number;
  name: string;
  description: string | null;
  createdBy: number | null;
  creatorName: string | null;
  members: TeamMemberDto[];
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
  createdBy: number;
}

export interface AddTeamMemberRequest {
  userId: number;
  role: string;
}
