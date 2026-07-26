import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * expo-secure-store has no web implementation, and `expo start --web` is a
 * supported script here, so fall back to localStorage on that platform.
 */
const isWeb = Platform.OS === 'web';

export async function getItem(key: string): Promise<string | null> {
  try {
    if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (isWeb) globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // A write failure only costs the user a re-login next launch.
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (isWeb) globalThis.localStorage?.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignore — the in-memory session is cleared by the caller regardless.
  }
}
