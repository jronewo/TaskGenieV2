import { apiClient } from "../../../core/api/client";
import { PlatformStatsDto } from "../types";

export const adminApi = {
  platformStats: () => apiClient.get<PlatformStatsDto>("/Admin/platform-stats"),
};
