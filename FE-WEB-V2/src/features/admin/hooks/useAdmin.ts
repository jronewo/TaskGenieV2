import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../api/adminApi";

export function usePlatformStats() {
  return useQuery({ queryKey: ["admin", "platform-stats"], queryFn: adminApi.platformStats });
}
