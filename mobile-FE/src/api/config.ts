import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * The API port from src/TaskGenie.API/Properties/launchSettings.json.
 */
const API_PORT = 5258;

/**
 * `localhost` on a phone means the phone itself, so it never reaches the dev
 * machine. Expo already knows the machine's LAN address (it's how the bundle
 * got here), so reuse it: `hostUri` looks like "192.168.1.12:8081".
 */
function hostFromExpo(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;
  if (!hostUri) return null;
  return hostUri.split(':')[0] || null;
}

const LOOPBACK = ['localhost', '127.0.0.1'];

function defaultBaseUrl(): string {
  const host = hostFromExpo();

  // On the Android emulator the dev server reports a loopback address, which
  // points at the emulated device itself; 10.0.2.2 is the host machine alias.
  if (Platform.OS === 'android' && (host === null || LOOPBACK.includes(host))) {
    return `http://10.0.2.2:${API_PORT}`;
  }

  return `http://${host ?? 'localhost'}:${API_PORT}`;
}

/**
 * Override by putting `EXPO_PUBLIC_API_URL=http://10.0.0.5:5258` in a `.env`
 * file at the project root — Expo inlines `EXPO_PUBLIC_*` at bundle time.
 */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? defaultBaseUrl()).replace(/\/+$/, '');

export const API_TIMEOUT_MS = 20000;
