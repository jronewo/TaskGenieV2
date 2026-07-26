import { apiRequest, apiUpload } from '../client';
import type { UserProfile, UserSearchResult } from '../types';

export const usersApi = {
  getById: (userId: number, signal?: AbortSignal) =>
    apiRequest<UserProfile>(`/api/users/${userId}`, { signal }),

  searchByEmail: (email: string, signal?: AbortSignal) =>
    apiRequest<UserSearchResult[]>('/api/users/search', { query: { email }, signal }),

  updateProfile: (userId: number, payload: { name?: string | null; avatar?: string | null }) =>
    apiRequest<UserProfile>(`/api/users/${userId}/profile`, { method: 'PUT', body: payload }),

  uploadAvatar: (userId: number, file: { uri: string; name: string; type: string }) =>
    apiUpload<{ avatarUrl: string }>(`/api/users/${userId}/avatar`, file),

  changePassword: (userId: number, currentPassword: string, newPassword: string) =>
    apiRequest<{ message: string }>(`/api/users/${userId}/change-password`, {
      method: 'PUT',
      body: { currentPassword, newPassword },
    }),
};
