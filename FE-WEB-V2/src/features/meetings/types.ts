export interface MeetingAttendeeDto {
  userId: number;
  userName: string | null;
  userEmail: string | null;
  status: string | null;
}

export interface MeetingDto {
  meetingId: number;
  projectId: number;
  projectName: string | null;
  organizedBy: number;
  organizerName: string | null;
  title: string | null;
  description: string | null;
  scheduledAt: string;
  endAt: string | null;
  location: string | null;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  attendees: MeetingAttendeeDto[];
}

export interface CreateMeetingRequest {
  projectId: number;
  organizedBy: number;
  title: string;
  description?: string;
  scheduledAt: string;
  endAt?: string;
  location?: string;
  attendeeUserIds?: number[];
}

export interface UpdateMeetingRequest {
  title?: string;
  description?: string;
  scheduledAt?: string;
  endAt?: string;
  location?: string;
  status?: string;
}
