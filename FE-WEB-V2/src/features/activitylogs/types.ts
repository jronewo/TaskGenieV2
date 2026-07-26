export interface ActivityLogDto {
  logId: number;
  userId: number | null;
  userName: string | null;
  action: string | null;
  entityType: string | null;
  entityId: number | null;
  /** Mock-only convenience field for local filtering — not part of the real ActivityLogDto. */
  projectId?: number | null;
  createdAt: string | null;
}
