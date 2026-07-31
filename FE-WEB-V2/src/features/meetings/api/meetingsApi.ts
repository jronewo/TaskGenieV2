import { apiClient } from "../../../core/api/client";
import { usersApi } from "../../users/api/usersApi";
import { CreateMeetingRequest, MeetingDto, UpdateMeetingRequest } from "../types";

export const meetingsApi = {
  get: (id: number) => apiClient.get<MeetingDto>(`/Meetings/${id}`),

  byProject: (projectId: number) => apiClient.get<MeetingDto[]>(`/Meetings/project/${projectId}`),

  upcomingByProject: (projectId: number) => apiClient.get<MeetingDto[]>(`/Meetings/project/${projectId}/upcoming`),

  myMeetings: () => apiClient.get<MeetingDto[]>("/Meetings/user"),

  create: (body: CreateMeetingRequest) => apiClient.post<MeetingDto>("/Meetings", body),

  update: (id: number, body: UpdateMeetingRequest) => apiClient.put<void>(`/Meetings/${id}`, body),

  remove: (id: number) => apiClient.delete<void>(`/Meetings/${id}`),

  // The real endpoint takes a userId, not an email — look the user up first (same pattern as
  // TeamsPage's invite flow) so the UI can keep asking for an email address.
  addAttendeeByEmail: async (id: number, email: string) => {
    const found = await usersApi.searchByEmail(email);
    return apiClient.post<{ message: string }>(`/Meetings/${id}/attendees`, { userId: found.userId });
  },

  removeAttendee: (id: number, userId: number) => apiClient.delete<void>(`/Meetings/${id}/attendees/${userId}`),

  updateAttendeeStatus: (id: number, userId: number, status: string) =>
    apiClient.put<void>(`/Meetings/${id}/attendees/status`, { userId, status }),
};
