import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { notificationApi, NotificationDto } from '../api';

/**
 * System notifications on the phone.
 *
 * These are *local* notifications: the app asks Android to post them. That is a deliberate choice
 * rather than a shortcut — remote push (server → device while the app is closed) goes through FCM,
 * which needs a Firebase project and a `google-services.json` that only the project owner can
 * create. Everything here works today with no credentials, and the moment an FCM key exists the
 * same rendering path is reused by the push receiver.
 *
 * What this does deliver: while the app is open or in the background, a genuine Android
 * notification — sound, banner, notification drawer — for anything new the API reports.
 */

// Banners must appear even when the app is in the foreground; otherwise a user staring at the task
// list never learns that something changed on another screen.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const ANDROID_CHANNEL_ID = 'taskgenie-default';

/** Android 8+ refuses to show anything that does not belong to a channel. */
export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'TaskGenie',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1A237E',
  });
}

/**
 * Asks once, and only on a real device — an emulator grants it silently, and asking repeatedly
 * after a refusal is how apps get their notifications turned off for good.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice && Platform.OS !== 'android') return false;

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;

  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function presentNotification(item: NotificationDto): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: item.title ?? 'TaskGenie',
      body: item.message ?? '',
      data: {
        notificationId: item.notificationId,
        referenceType: item.referenceType,
        referenceId: item.referenceId,
        projectId: item.projectId,
      },
    },
    // null means "now": this is a delivery, not a reminder.
    trigger: null,
  });
}

/**
 * Watches the server for notifications this device has not shown yet and raises one Android
 * notification per new row.
 *
 * Runs from the app shell rather than a screen, so it keeps working while the user is on any tab —
 * the inbox list has its own faster refresh for when you are actually looking at it.
 */
export function useNotificationWatcher(userId: number | null | undefined, intervalMs = 30000) {
  // Ids already shown. Without this, every poll would re-notify the same unread rows.
  const seen = useRef<Set<number>>(new Set());
  const primed = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    if (userId == null) return;
    try {
      const rows = await notificationApi.list(userId);
      if (!Array.isArray(rows)) return;

      // The first pass only records what already exists. Otherwise opening the app would fire a
      // burst of notifications for everything in the history.
      if (!primed.current) {
        rows.forEach((r) => seen.current.add(r.notificationId));
        primed.current = true;
        return;
      }

      for (const row of rows) {
        if (seen.current.has(row.notificationId)) continue;
        seen.current.add(row.notificationId);
        if (!row.isRead) await presentNotification(row);
      }
    } catch {
      // A failed poll is not worth surfacing; the next one is 30 seconds away.
    }
  }, [userId]);

  useEffect(() => {
    if (userId == null) {
      primed.current = false;
      seen.current.clear();
      return;
    }

    void (async () => {
      await ensureNotificationChannel();
      await requestNotificationPermission();
      await poll();
    })();

    timer.current = setInterval(() => void poll(), intervalMs);
    return () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [userId, intervalMs, poll]);
}
