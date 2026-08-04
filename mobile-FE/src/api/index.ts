import { apiRequest } from './client';
import {
  CommentDto, NotificationDto,
  MySkillDto, ProjectDto, SkillDto, TaskDto, TeamMemberDto,
} from './types';

/** Every call here hits the same API and database the web console uses — no mock layer. */

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<any>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (name: string, email: string, password: string) =>
    apiRequest<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  /** The server validates the token against its own Google client id; the app never sees a secret. */
  google: (idToken: string) =>
    apiRequest<any>('/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),

  me: () => apiRequest<any>('/auth/me'),
};

export const projectApi = {
  /** `GET /projects` is already scoped to the caller — there is no `/projects/my`, and the
      `{id}` route swallows it and fails to parse "my" as an int. */
  mine: () => apiRequest<ProjectDto[]>('/projects'),
  getById: (projectId: number) => apiRequest<ProjectDto>(`/projects/${projectId}`),
};

export const taskApi = {
  /** The dashboard's "what do I have to do" list. */
  mine: () => apiRequest<TaskDto[]>('/tasks/my'),

  byProject: (projectId: number) => apiRequest<TaskDto[]>(`/tasks?projectId=${projectId}`),

  getById: (taskId: number) => apiRequest<TaskDto>(`/tasks/${taskId}`),

  updateProgress: (taskId: number, body: { status?: string; progress?: number }) =>
    apiRequest<TaskDto>(`/tasks/${taskId}/progress`, { method: 'PUT', body: JSON.stringify(body) }),

  /** Reads hours and a 1–5 difficulty off the description. */
  estimate: (taskId: number) => apiRequest<TaskDto>(`/tasks/${taskId}/estimate`, { method: 'POST' }),
};

export const commentApi = {
  byTask: (taskId: number) => apiRequest<CommentDto[]>(`/taskcomments/task/${taskId}`),

  create: (taskId: number, content: string, imageUrl: string | null = null) =>
    apiRequest<CommentDto>('/taskcomments', {
      method: 'POST',
      body: JSON.stringify({ taskId, content, imageUrl }),
    }),
};

export const assignmentApi = {
  /** Ranked candidates for a task — skill match, workload and past performance. */
  recommend: (taskId: number, projectId: number) =>
    apiRequest<any[]>('/task-assignment/recommend', {
      method: 'POST',
      body: JSON.stringify({ taskId, projectId }),
    }),

  accept: (taskId: number, userId: number) =>
    apiRequest<{ message: string }>('/task-assignment/accept', {
      method: 'POST',
      body: JSON.stringify({ taskId, userId, outcome: null }),
    }),
};

export const teamApi = {
  members: (teamId: number) => apiRequest<TeamMemberDto[]>(`/teams/${teamId}/members`),
};

export const notificationApi = {
  list: (userId: number) => apiRequest<NotificationDto[]>(`/notifications/user/${userId}`),

  unreadCount: (userId: number) =>
    apiRequest<{ count: number }>(`/notifications/user/${userId}/unread-count`),

  markRead: (notificationId: number) =>
    apiRequest<void>(`/notifications/${notificationId}/read`, { method: 'PUT' }),

  markAllRead: (userId: number) =>
    apiRequest<void>(`/notifications/user/${userId}/read-all`, { method: 'PUT' }),

  remove: (notificationId: number) =>
    apiRequest<void>(`/notifications/${notificationId}`, { method: 'DELETE' }),
};

export const userApi = {
  updateProfile: (name: string | null, avatar: string | null) =>
    apiRequest<any>('/users/me/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, avatar }),
    }),

  /**
   * Uploads to Cloudinary through the API and returns the hosted URL. The multipart body must not
   * be given a JSON content type — the client leaves FormData alone for exactly this reason.
   */
  uploadAvatar: (uri: string, fileName = 'avatar.jpg') => {
    const form = new FormData();
    form.append('file', { uri, name: fileName, type: 'image/jpeg' } as any);
    return apiRequest<{ avatarUrl: string }>('/users/me/avatar', { method: 'POST', body: form });
  },

  uploadImage: (uri: string, fileName = 'comment.jpg', folder = 'taskgenie/comments') => {
    const form = new FormData();
    form.append('file', { uri, name: fileName, type: 'image/jpeg' } as any);
    return apiRequest<{ imageUrl: string }>(`/users/upload-image?folder=${encodeURIComponent(folder)}`, {
      method: 'POST',
      body: form,
    });
  },
};

export const skillApi = {
  /** Active catalog only — archived skills stay referenced but are not offered. */
  catalog: () => apiRequest<SkillDto[]>('/skills'),

  mine: () => apiRequest<MySkillDto[]>('/skills/me'),

  add: (skillId: number, level: number) =>
    apiRequest<any>('/skills/user', { method: 'POST', body: JSON.stringify({ skillId, level }) }),

  setLevel: (userSkillId: number, level: number) =>
    apiRequest<void>(`/skills/user/${userSkillId}`, { method: 'PUT', body: JSON.stringify(level) }),

  remove: (userSkillId: number) =>
    apiRequest<void>(`/skills/user/${userSkillId}`, { method: 'DELETE' }),
};


export const invitationApi = {
  mine: (email: string) => apiRequest<any[]>(`/invitations/user/${encodeURIComponent(email)}`),

  respond: (invitationId: number, status: 'Accepted' | 'Rejected') =>
    apiRequest<void>(`/invitations/${invitationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
};

export const assistantApi = {
  /** Same rule-based assistant the web console uses; scoped to one project when given. */
  ask: (question: string, projectId: number | null) =>
    apiRequest<{ answer: string; actions?: { label: string }[] }>('/ai-analysis/assistant', {
      method: 'POST',
      body: JSON.stringify({ question, projectId }),
    }),
};

export * from './types';
export { ApiError } from './client';
