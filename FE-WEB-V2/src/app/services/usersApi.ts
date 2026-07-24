import { apiRequest, ApiError } from "./apiClient";

export interface UserSummaryDto {
  userId: number;
  name: string;
  email: string;
  avatar: string | null;
}

export const usersApi = {
  searchByEmail: async (email: string): Promise<UserSummaryDto | null> => {
    try {
      return await apiRequest<UserSummaryDto>(`/Users/search?email=${encodeURIComponent(email)}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },
};
