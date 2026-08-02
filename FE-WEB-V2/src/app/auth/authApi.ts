import { apiRequest } from "../services/apiClient";
import { AuthResponseDto, MeResponseDto } from "./types";

export const authApi = {
  register: (name: string, email: string, password: string) =>
    apiRequest<AuthResponseDto>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
      authenticated: false,
    }),

  login: (email: string, password: string) =>
    apiRequest<AuthResponseDto>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      authenticated: false,
    }),

  loginWithGoogle: (idToken: string) =>
    apiRequest<AuthResponseDto>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
      authenticated: false,
    }),

  /** Rotates the refresh-token family. A rejection means the session is dead for good. */
  refresh: (refreshToken: string) =>
    apiRequest<AuthResponseDto>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
      authenticated: false,
    }),

  me: () => apiRequest<MeResponseDto>("/auth/me"),

  logout: (refreshToken: string | null) =>
    apiRequest<{ message: string }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  forgotPassword: (email: string) =>
    apiRequest<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
      authenticated: false,
    }),

  resetPassword: (token: string, newPassword: string) =>
    apiRequest<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
      authenticated: false,
    }),
};
