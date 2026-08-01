export const PLATFORM_ADMIN_ROLE = "PLATFORM_ADMIN";

export interface AuthResponseDto {
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

export interface AuthUser {
  userId: number;
  name: string | null;
  email: string | null;
  role: string;
  isFirstLogin: boolean;
  isOrgOwner: boolean;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  expiresAtUtc: string;
}

export const isPlatformAdmin = (user: AuthUser | null): boolean =>
  user?.role === PLATFORM_ADMIN_ROLE;
