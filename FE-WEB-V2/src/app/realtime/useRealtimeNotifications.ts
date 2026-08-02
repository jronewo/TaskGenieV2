import { useEffect, useRef } from "react";
import { HubConnection, HubConnectionBuilder, HttpTransportType, LogLevel } from "@microsoft/signalr";
import { NotificationDto } from "../services/notificationApi";

/** Payload the hub sends. Mirrors NotificationPayload on the server. */
interface HubNotification {
  notificationId: number;
  userId: number;
  type: string | null;
  title: string | null;
  message: string | null;
  referenceId: number | null;
  referenceType: string | null;
  createdAt: string | null;
}

function hubUrl(): string {
  // The API base is ".../api"; the hub sits next to it, not under it.
  const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5258/api";
  return `${base.replace(/\/api\/?$/, "")}/hubs/notifications`;
}

interface Options {
  /** Null while signed out — the connection is only opened for an authenticated session. */
  token: string | null;
  onNotification: (notification: NotificationDto) => void;
}

/**
 * Live notification feed over SignalR.
 *
 * The connection is a nudge, not the source of truth: every payload is also a row the REST API
 * returns, so a dropped socket degrades to "you see it on next load" rather than losing anything.
 * That is why nothing here throws — a failed connection is logged and retried, never surfaced as a
 * blocking error.
 */
export function useRealtimeNotifications({ token, onNotification }: Options) {
  // Held in a ref so an inline handler from the caller cannot restart the connection every render.
  const handlerRef = useRef(onNotification);
  handlerRef.current = onNotification;

  useEffect(() => {
    if (!token) return;

    let connection: HubConnection | null = null;
    let cancelled = false;

    void (async () => {
      const built = new HubConnectionBuilder()
        .withUrl(hubUrl(), {
          // Bearer token, not cookies: the API allows any origin, which rules out credentialed
          // requests, and the server reads `access_token` from the query for the WebSocket
          // handshake because browsers cannot set headers on it.
          accessTokenFactory: () => token,
          withCredentials: false,
          transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Warning)
        .build();

      built.on("notification", (payload: HubNotification) => {
        handlerRef.current({
          notificationId: payload.notificationId,
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          referenceId: payload.referenceId,
          referenceType: payload.referenceType,
          isRead: false,
          createdAt: payload.createdAt,
        });
      });

      try {
        await built.start();
        if (cancelled) {
          await built.stop();
          return;
        }
        connection = built;
      } catch {
        // Realtime is an enhancement; the app keeps working on plain REST loads.
      }
    })();

    return () => {
      cancelled = true;
      void connection?.stop();
    };
  }, [token]);
}
