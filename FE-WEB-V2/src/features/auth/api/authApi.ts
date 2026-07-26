import { apiClient } from "../../../core/api/client";
import { AuthResponse, GoogleLoginRequest, LoginRequest, RegisterRequest } from "../types";

export const authApi = {
  login: (body: LoginRequest) => apiClient.post<AuthResponse>("/auth/login", body),
  register: (body: RegisterRequest) => apiClient.post<AuthResponse>("/auth/register", body),
  google: (body: GoogleLoginRequest) => apiClient.post<AuthResponse>("/auth/google", body),
  logout: () => apiClient.post<{ message: string }>("/auth/logout"),
};
