import { apiClient } from "../../../core/api/client";
import { UserProfileDto, UserSearchDto } from "../types";

export const usersApi = {
  get: (id: number) => apiClient.get<UserProfileDto>(`/Users/${id}`),
  searchByEmail: (email: string) => apiClient.get<UserSearchDto>(`/Users/search?email=${encodeURIComponent(email)}`),
  updateProfile: (id: number, body: { name?: string; avatar?: string }) =>
    apiClient.put<UserProfileDto>(`/Users/${id}/profile`, body),
  uploadAvatar: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<{ avatarUrl: string }>(`/Users/${id}/avatar`, form);
  },
  changePassword: (id: number, body: { currentPassword: string; newPassword: string }) =>
    apiClient.put<{ message: string }>(`/Users/${id}/change-password`, body),
};
