// MOCK — see MOCK_API_TODO.md. Function names/signatures match /api/meetings routes.
import { loadMockState, mockDelay, nextMockId, saveMockState } from "../../../core/api/mock";
import { CreateMeetingRequest, MeetingAttendeeDto, MeetingDto, UpdateMeetingRequest } from "../types";

let meetings = loadMockState<MeetingDto[]>("meetings", [
  {
    meetingId: 1,
    projectId: 1,
    projectName: "TaskGenie Web Revamp",
    organizedBy: 1,
    organizerName: "Alex Nguyen",
    title: "Sprint Planning",
    description: "Plan the next two-week sprint and review the risk backlog.",
    scheduledAt: "2026-07-28T09:00:00Z",
    endAt: "2026-07-28T10:00:00Z",
    location: "Google Meet",
    status: "Scheduled",
    createdAt: "2026-07-20T00:00:00Z",
    updatedAt: null,
    attendees: [
      { userId: 1, userName: "Alex Nguyen", userEmail: "alex@taskgenie.dev", status: "Accepted" },
      { userId: 2, userName: "Bao Le", userEmail: "bao@taskgenie.dev", status: "Pending" },
    ],
  },
]);

function persist() {
  saveMockState("meetings", meetings);
}

function attendeeFromEmail(email: string): MeetingAttendeeDto {
  return {
    userId: -(Math.abs(hashCode(email)) % 100000),
    userName: email.split("@")[0],
    userEmail: email,
    status: "Pending",
  };
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

export const meetingsApi = {
  get: (id: number) => mockDelay(meetings.find((m) => m.meetingId === id) ?? null), // TODO: GET /meetings/{id}

  byProject: (projectId: number) => mockDelay(meetings.filter((m) => m.projectId === projectId)), // TODO: GET /meetings/project/{projectId}

  upcomingByProject: (projectId: number) =>
    mockDelay(
      meetings
        .filter((m) => m.projectId === projectId && new Date(m.scheduledAt).getTime() >= Date.now())
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    ), // TODO: GET /meetings/project/{projectId}/upcoming

  myMeetings: () => mockDelay(meetings), // TODO: GET /meetings/user

  create: (body: CreateMeetingRequest) => {
    const entry: MeetingDto = {
      meetingId: nextMockId(meetings, "meetingId"),
      projectId: body.projectId,
      projectName: null,
      organizedBy: body.organizedBy,
      organizerName: null,
      title: body.title,
      description: body.description ?? null,
      scheduledAt: body.scheduledAt,
      endAt: body.endAt ?? null,
      location: body.location ?? null,
      status: "Scheduled",
      createdAt: new Date().toISOString(),
      updatedAt: null,
      attendees: [],
    };
    meetings = [entry, ...meetings];
    persist();
    return mockDelay(entry);
  }, // TODO: POST /meetings

  update: (id: number, body: UpdateMeetingRequest) => {
    meetings = meetings.map((m) => (m.meetingId === id ? { ...m, ...body, updatedAt: new Date().toISOString() } : m));
    persist();
    return mockDelay(undefined);
  }, // TODO: PUT /meetings/{id}

  remove: (id: number) => {
    meetings = meetings.filter((m) => m.meetingId !== id);
    persist();
    return mockDelay(undefined);
  }, // TODO: DELETE /meetings/{id}

  addAttendeeByEmail: (id: number, email: string) => {
    meetings = meetings.map((m) => (m.meetingId === id ? { ...m, attendees: [...m.attendees, attendeeFromEmail(email)] } : m));
    persist();
    return mockDelay({ message: "Attendee added." });
  }, // TODO: POST /meetings/{id}/attendees (Body: { userId }) — mock resolves userId from email locally

  removeAttendee: (id: number, userId: number) => {
    meetings = meetings.map((m) => (m.meetingId === id ? { ...m, attendees: m.attendees.filter((a) => a.userId !== userId) } : m));
    persist();
    return mockDelay(undefined);
  }, // TODO: DELETE /meetings/{id}/attendees/{userId}

  updateAttendeeStatus: (id: number, userId: number, status: string) => {
    meetings = meetings.map((m) =>
      m.meetingId === id ? { ...m, attendees: m.attendees.map((a) => (a.userId === userId ? { ...a, status } : a)) } : m
    );
    persist();
    return mockDelay(undefined);
  }, // TODO: PUT /meetings/{id}/attendees/status
};
