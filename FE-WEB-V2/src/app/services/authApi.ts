import { apiRequest } from "./apiClient";

export interface AuthResponse {
  userId: number;
  name: string;
  email: string;
  role: string;
  isFirstLogin: boolean;
  isOrgOwner: boolean;
  accessToken: string;
  expiresAtUtc: string;
  message: string;
}

export const authApi = {
  google: (idToken: string) =>
    apiRequest<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    }),

  logout: () =>
    apiRequest<{ message: string }>("/auth/logout", { method: "POST" }),
};
