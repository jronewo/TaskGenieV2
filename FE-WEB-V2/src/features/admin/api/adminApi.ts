// MOCK — see MOCK_API_TODO.md. Function names/signatures match /api/admin routes.
import { mockDelay } from "../../../core/api/mock";
import { PlatformStatsDto } from "../types";

export const adminApi = {
  platformStats: () =>
    mockDelay<PlatformStatsDto>({
      users: 128,
      organizations: 6,
      projects: 34,
      tasks: 512,
      tasksDone: 361,
    }), // TODO: GET /admin/platform-stats
};
