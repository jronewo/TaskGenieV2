import { apiRequest } from '../client';
import type { AuthResponse } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      anonymous: true,
    }),

  register: (name: string, email: string, password: string) =>
    apiRequest<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: { name, email, password },
      anonymous: true,
    }),

  googleLogin: (idToken: string) =>
    apiRequest<AuthResponse>('/api/auth/google', {
      method: 'POST',
      body: { idToken },
      anonymous: true,
    }),

  logout: () => apiRequest<{ message: string }>('/api/auth/logout', { method: 'POST' }),
};
