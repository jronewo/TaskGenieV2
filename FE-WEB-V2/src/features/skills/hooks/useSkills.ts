import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { skillsApi } from "../api/skillsApi";
import { AddUserSkillRequest, CreateSkillRequest } from "../types";

const catalogKey = ["skills", "catalog"] as const;
const userSkillsKey = (userId: number) => ["skills", "user", userId] as const;

export function useSkillCatalog() {
  return useQuery({ queryKey: catalogKey, queryFn: skillsApi.list });
}

export function useUserSkills(userId: number | null) {
  return useQuery({
    queryKey: userId ? userSkillsKey(userId) : ["skills", "user", "none"],
    queryFn: () => skillsApi.userSkills(userId as number),
    enabled: userId !== null,
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSkillRequest) => skillsApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogKey }),
  });
}

export function useAddUserSkill(userId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddUserSkillRequest) => skillsApi.addUserSkill(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userSkillsKey(userId) }),
  });
}

export function useUpdateUserSkill(userId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userSkillId, level }: { userSkillId: number; level: number }) => skillsApi.updateUserSkill(userSkillId, level),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userSkillsKey(userId) }),
  });
}

export function useRemoveUserSkill(userId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userSkillId: number) => skillsApi.removeUserSkill(userSkillId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userSkillsKey(userId) }),
  });
}
