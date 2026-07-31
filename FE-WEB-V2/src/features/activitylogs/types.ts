export interface ActivityLogDto {
  logId: number;
  userId: number | null;
  userName: string | null;
  action: string | null;
  entityType: string | null;
  entityId: number | null;
  createdAt: string | null;
}
