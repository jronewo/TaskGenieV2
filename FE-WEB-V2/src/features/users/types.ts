export interface UserProfileDto {
  userId: number;
  name: string | null;
  email: string | null;
  avatar: string | null;
  role: string | null;
  createdAt: string | null;
}

export interface UserSearchDto {
  userId: number;
  name: string;
  email: string;
  avatar: string | null;
}
