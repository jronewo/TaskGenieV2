export const PLATFORM_ADMIN_ROLE = "PLATFORM_ADMIN";

export interface AuthResponseDto {
  userId: number;
  name: string | null;
  email: string | null;
  role: string;
  /** Present since the login response started carrying it; before that every avatar fell back
      to initials until something happened to call /auth/me. */
  avatar: string | null;
  isFirstLogin: boolean;
  isOrgOwner: boolean;
  accessToken: string;
  expiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
  message: string;
}

/** Shape of GET /api/auth/me — the authority on who the caller is after a page reload. */
export interface MeResponseDto {
  userId: number;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  isOrgOwner: boolean;
  createdAt: string | null;
}

export interface AuthUser {
  userId: number;
  name: string | null;
  email: string | null;
  role: string;
  isFirstLogin: boolean;
  isOrgOwner: boolean;
  avatar?: string | null;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  expiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
}

export const isPlatformAdmin = (user: AuthUser | null): boolean =>
  user?.role === PLATFORM_ADMIN_ROLE;
