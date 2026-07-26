import { api } from "../lib/apiClient";
import type { TeamDto } from "../types/api";

export async function fetchMyTeams(): Promise<TeamDto[]> {
  return api<TeamDto[]>("/teams/my");
}
