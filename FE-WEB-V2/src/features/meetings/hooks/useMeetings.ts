import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { meetingsApi } from "../api/meetingsApi";
import { CreateMeetingRequest, UpdateMeetingRequest } from "../types";

const myMeetingsKey = ["meetings", "my"] as const;
const byProjectKey = (projectId: number) => ["meetings", "project", projectId] as const;
const upcomingKey = (projectId: number) => ["meetings", "project", projectId, "upcoming"] as const;

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, projectId?: number) {
  queryClient.invalidateQueries({ queryKey: myMeetingsKey });
  if (projectId) {
    queryClient.invalidateQueries({ queryKey: byProjectKey(projectId) });
    queryClient.invalidateQueries({ queryKey: upcomingKey(projectId) });
  }
}

export function useMyMeetings() {
  return useQuery({ queryKey: myMeetingsKey, queryFn: meetingsApi.myMeetings });
}

export function useProjectMeetings(projectId: number | null) {
  return useQuery({
    queryKey: projectId ? byProjectKey(projectId) : ["meetings", "project", "none"],
    queryFn: () => meetingsApi.byProject(projectId as number),
    enabled: projectId !== null,
  });
}

export function useUpcomingMeetings(projectId: number | null) {
  return useQuery({
    queryKey: projectId ? upcomingKey(projectId) : ["meetings", "project", "none", "upcoming"],
    queryFn: () => meetingsApi.upcomingByProject(projectId as number),
    enabled: projectId !== null,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMeetingRequest) => meetingsApi.create(body),
    onSuccess: (data) => invalidateAll(queryClient, data.projectId),
  });
}

export function useUpdateMeeting(projectId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateMeetingRequest }) => meetingsApi.update(id, body),
    onSuccess: () => invalidateAll(queryClient, projectId),
  });
}

export function useDeleteMeeting(projectId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => meetingsApi.remove(id),
    onSuccess: () => invalidateAll(queryClient, projectId),
  });
}

export function useAddAttendee(projectId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ meetingId, email }: { meetingId: number; email: string }) => meetingsApi.addAttendeeByEmail(meetingId, email),
    onSuccess: () => invalidateAll(queryClient, projectId),
  });
}

export function useUpdateAttendeeStatus(projectId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ meetingId, userId, status }: { meetingId: number; userId: number; status: string }) =>
      meetingsApi.updateAttendeeStatus(meetingId, userId, status),
    onSuccess: () => invalidateAll(queryClient, projectId),
  });
}

export function useRemoveAttendee(projectId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ meetingId, userId }: { meetingId: number; userId: number }) => meetingsApi.removeAttendee(meetingId, userId),
    onSuccess: () => invalidateAll(queryClient, projectId),
  });
}
