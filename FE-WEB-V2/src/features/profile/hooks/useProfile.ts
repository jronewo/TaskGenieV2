import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../core/auth/AuthContext";
import { usersApi } from "../../users/api/usersApi";

const profileKey = (userId: number) => ["users", userId] as const;

export function useMyProfile() {
  const { user } = useAuth();
  const userId = user?.userId ?? null;
  return useQuery({
    queryKey: userId ? profileKey(userId) : ["users", "none"],
    queryFn: () => usersApi.get(userId as number),
    enabled: userId !== null,
  });
}

export function useUpdateProfile() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; avatar?: string }) => usersApi.updateProfile(user?.userId as number, body),
    onSuccess: (result) => {
      if (!user) return;
      updateUser({ name: result.name });
      queryClient.invalidateQueries({ queryKey: profileKey(user.userId) });
    },
  });
}

export function useUploadAvatar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => usersApi.uploadAvatar(user?.userId as number, file),
    onSuccess: () => {
      if (!user) return;
      queryClient.invalidateQueries({ queryKey: profileKey(user.userId) });
    },
  });
}

export function useChangePassword() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      usersApi.changePassword(user?.userId as number, body),
  });
}
