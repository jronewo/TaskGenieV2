import { apiRequest } from "../services/apiClient";
import { AuthResponseDto } from "./types";

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

  logout: () =>
    apiRequest<{ message: string }>("/auth/logout", { method: "POST" }),
};
