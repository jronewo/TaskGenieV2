import * as FileSystem from 'expo-file-system';

/**
 * Session persistence.
 *
 * Stored through expo-file-system, which the app already depends on, rather than pulling in
 * AsyncStorage — a new runtime dependency needs the project owner's sign-off, and one JSON blob
 * does not justify it.
 */
const SESSION_FILE = `${FileSystem.documentDirectory}taskgenie-session.json`;

export interface StoredUser {
  userId: number;
  name: string | null;
  email: string | null;
  role: string;
  avatar: string | null;
  isOrgOwner: boolean;
}

export interface StoredSession {
  user: StoredUser;
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
}

export async function readSession(): Promise<StoredSession | null> {
  try {
    const info = await FileSystem.getInfoAsync(SESSION_FILE);
    if (!info.exists) return null;
    return JSON.parse(await FileSystem.readAsStringAsync(SESSION_FILE)) as StoredSession;
  } catch {
    // A corrupt file must log the user out, never crash the launch.
    return null;
  }
}

export async function writeSession(session: StoredSession): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(SESSION_FILE, JSON.stringify(session));
  } catch {
    // Staying signed in is a convenience; failing to persist is not worth an error to the user.
  }
}

export async function clearSession(): Promise<void> {
  try {
    await FileSystem.deleteAsync(SESSION_FILE, { idempotent: true });
  } catch {
    // Already gone is the outcome we wanted.
  }
}
