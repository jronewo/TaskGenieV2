export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface AuthResponse {
  userId: number;
  name: string | null;
  email: string | null;
  role: string;
  isFirstLogin: boolean;
  isOrgOwner: boolean;
  accessToken: string;
  expiresAtUtc: string;
  message: string;
}
