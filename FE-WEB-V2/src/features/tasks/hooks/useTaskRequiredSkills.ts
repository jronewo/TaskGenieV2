import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskRequiredSkillsApi } from "../api/taskRequiredSkillsApi";
import { SkillDto } from "../../skills/types";

const key = (taskId: number) => ["tasks", taskId, "required-skills"] as const;

export function useTaskRequiredSkills(taskId: number | null) {
  return useQuery({
    queryKey: taskId ? key(taskId) : ["tasks", "none", "required-skills"],
    queryFn: () => taskRequiredSkillsApi.byTask(taskId as number),
    enabled: taskId !== null,
  });
}

export function useSetTaskRequiredSkills(taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ skillIds, catalog }: { skillIds: number[]; catalog: SkillDto[] }) => taskRequiredSkillsApi.set(taskId, skillIds, catalog),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(taskId) }),
  });
}
