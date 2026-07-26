export interface NotificationDto {
  notificationId: number;
  userId: number | null;
  type: string | null;
  title: string | null;
  message: string | null;
  referenceId: number | null;
  referenceType: string | null;
  isRead: boolean;
  createdAt: string | null;
}
