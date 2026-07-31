import { Platform } from 'react-native';

// Standard API base URL depending on environment/platform
// Android Emulator uses 10.0.2.2 to access host machine localhost
export const API_BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:5258/api'
  : 'http://localhost:5258/api';

export interface TaskAssigneeDto {
  userId: number;
  userName?: string;
  avatar?: string;
}

export interface TaskDto {
  taskId: number;
  projectId?: number;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  deadline?: string;
  estimatedTime?: number;
  actualTime?: number;
  progress?: number;
  riskLevel?: string;
  assignees?: TaskAssigneeDto[];
}

/**
 * Fetch tasks for a specific project from backend: GET /api/Tasks?projectId={projectId}
 */
export async function fetchTasksByProject(projectId: number): Promise<TaskDto[]> {
  const url = `${API_BASE_URL}/Tasks?projectId=${projectId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tasks for project ${projectId}. Status: ${response.status}`);
  }

  return await response.json();
}
