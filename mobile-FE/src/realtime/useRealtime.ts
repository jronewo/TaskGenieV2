import { useEffect, useRef } from 'react';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { API_BASE_URL } from '../api/config';
import { NotificationDto } from '../api';

/** The hub lives beside the API, not under /api. */
const HUB_URL = `${API_BASE_URL.replace(/\/api$/, '')}/hubs/notifications`;

type Handler = (payload: NotificationDto) => void;

/**
 * Live connection to the same SignalR hub the web console uses, so a comment posted on the desktop
 * appears on the phone without waiting for a poll — and the other way round.
 *
 * The server pushes to the signed-in user's own group, so nothing arrives that the caller could not
 * already read. If the socket cannot be established the app is not broken: the inbox keeps its
 * polling fallback, which is why this fails quietly.
 */
export function useRealtime(accessToken: string | null | undefined, onNotification: Handler) {
  const connection = useRef<HubConnection | null>(null);
  // Held in a ref so a caller passing an inline arrow does not tear the socket down every render.
  const handler = useRef(onNotification);
  handler.current = onNotification;

  useEffect(() => {
    if (!accessToken) return;

    const hub = new HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => accessToken })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Error)
      .build();

    // Verified against SignalRNotificationPublisher — the hub sends "notification", and a mismatched
    // event name fails silently: the socket connects and simply never fires.
    hub.on('notification', (payload: NotificationDto) => handler.current(payload));

    hub.start().catch(() => {
      // Offline, or the hub is unreachable from this device — polling still covers it.
    });

    connection.current = hub;
    return () => {
      void hub.stop();
      connection.current = null;
    };
  }, [accessToken]);
}
