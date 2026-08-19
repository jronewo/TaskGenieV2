import { apiRequest } from "./apiClient";

/**
 * Identity endpoints act on the authenticated user only — the API deliberately has no
 * "update user {id}" route any more (see the Slice 0 authorization fixes).
 */
export const userApi = {
  /** Uploads through Cloudinary and returns the hosted URL; the caller then saves it on the profile. */
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    // No Content-Type header: the browser has to set the multipart boundary itself.
    return apiRequest<{ avatarUrl: string }>("/users/me/avatar", { method: "POST", body: form });
  },

  /** Uploads an attachment (comment images) and returns its hosted URL. */
  uploadImage: (file: File, folder = "taskgenie/comments") => {
    const form = new FormData();
    form.append("file", file);
    return apiRequest<{ imageUrl: string }>(`/users/upload-image?folder=${encodeURIComponent(folder)}`, {
      method: "POST",
      body: form,
    });
  },

  updateProfile: (payload: { name?: string | null; avatar?: string | null }) =>
    apiRequest<{ userId: number; name: string; email: string; avatar: string | null }>("/users/me/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ message: string }>("/users/me/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};
