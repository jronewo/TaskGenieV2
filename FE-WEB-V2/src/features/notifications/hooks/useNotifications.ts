import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../core/auth/AuthContext";
import { notificationsApi } from "../api/notificationsApi";

const listKey = (userId: number) => ["notifications", userId] as const;
const unreadKey = (userId: number) => ["notifications", userId, "unread-count"] as const;

export function useNotificationsList() {
  const { user } = useAuth();
  const userId = user?.userId ?? null;
  return useQuery({
    queryKey: userId ? listKey(userId) : ["notifications", "none"],
    queryFn: () => notificationsApi.list(userId as number),
    enabled: userId !== null,
  });
}

export function useUnreadCount() {
  const { user } = useAuth();
  const userId = user?.userId ?? null;
  return useQuery({
    queryKey: userId ? unreadKey(userId) : ["notifications", "none", "unread-count"],
    queryFn: () => notificationsApi.unreadCount(userId as number),
    enabled: userId !== null,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      if (!user) return;
      queryClient.invalidateQueries({ queryKey: listKey(user.userId) });
      queryClient.invalidateQueries({ queryKey: unreadKey(user.userId) });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(user?.userId as number),
    onSuccess: () => {
      if (!user) return;
      queryClient.invalidateQueries({ queryKey: listKey(user.userId) });
      queryClient.invalidateQueries({ queryKey: unreadKey(user.userId) });
    },
  });
}

export function useDeleteNotification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.remove(id),
    onSuccess: () => {
      if (!user) return;
      queryClient.invalidateQueries({ queryKey: listKey(user.userId) });
      queryClient.invalidateQueries({ queryKey: unreadKey(user.userId) });
    },
  });
}
