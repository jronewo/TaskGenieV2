import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AlertTriangle, Bell, CheckCheck, FolderKanban } from 'lucide-react-native';
import { notificationApi, NotificationDto } from '../api';
import { useAuth } from '../auth/AuthContext';
import { useRealtime } from '../realtime/useRealtime';
import { colors } from '../theme';

/**
 * Fallback refresh interval.
 *
 * Live updates come from the SignalR hub the web console also uses; this poll only covers the case
 * where the socket cannot be established (offline, or a network that blocks websockets). It runs
 * while the screen is focused and stops the moment it is left.
 */
const POLL_MS = 15000;

/** Kinds that have something to read or decide, rather than somewhere to go. */
const NEEDS_DETAIL = new Set(['COMMENT', 'INVITATION']);

const TYPE_COLOR: Record<string, string> = {
  COMMENT: colors.blue,
  TASK_ASSIGNED: colors.purpleLight,
  TASK_REVIEW: colors.yellow,
  TASK_RISK: colors.red,
  RISK: colors.red,
  INVITATION: colors.green,
};

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export default function InboxScreen() {
  const navigation = useNavigation<any>();
  const { user, accessToken } = useAuth();

  const [items, setItems] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (user?.userId == null) return;
    try {
      const rows = await notificationApi.list(user.userId);
      setItems(Array.isArray(rows) ? rows : []);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được thông báo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.userId]);

  // Poll only while focused, and always clear on the way out — a timer left running behind a
  // navigated-away screen keeps hitting the API forever.
  useFocusEffect(
    useCallback(() => {
      void load();
      timer.current = setInterval(() => void load(), POLL_MS);
      return () => {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
      };
    }, [load])
  );

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  // The poll is the floor. This is what makes a comment posted on the web appear here at once.
  useRealtime(accessToken, () => void load());

  const open = (n: NotificationDto) => {
    setItems((rows) =>
      rows.map((r) => (r.notificationId === n.notificationId ? { ...r, isRead: true } : r))
    );

    // Only two kinds are worth stopping on: an invitation has to be decided, and a comment carries
    // text and an image that jumping straight to the board would throw away. Everything else —
    // assigned, review, risk — is a pointer, so it goes where it points.
    if (NEEDS_DETAIL.has((n.type ?? '').toUpperCase())) {
      navigation.navigate('NotificationDetail', { notificationId: n.notificationId, notification: n });
      return;
    }

    if (n.referenceType === 'TASK' && n.referenceId != null) {
      void notificationApi.markRead(n.notificationId).catch(() => undefined);
      navigation.navigate('TaskDetail', { taskId: n.referenceId });
    } else if (n.projectId != null) {
      void notificationApi.markRead(n.notificationId).catch(() => undefined);
      navigation.navigate('ProjectTasks', { projectId: n.projectId, projectName: n.projectName });
    } else {
      navigation.navigate('NotificationDetail', { notificationId: n.notificationId, notification: n });
    }
  };

  const markAll = async () => {
    if (user?.userId == null || busy) return;
    setBusy(true);
    try {
      await notificationApi.markAllRead(user.userId);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const unread = items.filter((n) => !n.isRead).length;

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.blue} /></View>;
  }

  return (
    // Tabs hide the header, so the safe area is the only thing keeping content clear of the
    // status bar and the camera cut-out.
    <SafeAreaView style={styles.root} edges={['top']}>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); void load(); }}
          tintColor={colors.blue}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Thông báo</Text>
          <Text style={styles.subtitle}>{unread > 0 ? `${unread} chưa đọc` : 'Đã xem hết'}</Text>
        </View>
        {unread > 0 && (
          <Pressable onPress={markAll} disabled={busy} style={styles.markAll}>
            <CheckCheck size={13} color={colors.blue} />
            <Text style={styles.markAllText}>Đánh dấu đã đọc</Text>
          </Pressable>
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <AlertTriangle size={14} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {items.length === 0 && (
        <View style={styles.emptyBox}>
          <Bell size={26} color={colors.muted} />
          <Text style={styles.empty}>Chưa có thông báo nào.</Text>
        </View>
      )}

      {items.map((n) => {
        const accent = TYPE_COLOR[(n.type ?? '').toUpperCase()] ?? colors.muted;
        return (
          <Pressable
            key={n.notificationId}
            onPress={() => open(n)}
            style={[styles.card, !n.isRead && styles.cardUnread]}
          >
            <View style={styles.cardTop}>
              <View style={[styles.typeDot, { backgroundColor: accent }]} />
              <Text style={styles.cardTitle} numberOfLines={2}>{n.title ?? 'Thông báo'}</Text>
              {!n.isRead && <View style={styles.unreadDot} />}
            </View>
            {n.message ? <Text style={styles.cardBody} numberOfLines={3}>{n.message}</Text> : null}
            {/* A comment that was mostly a screenshot reads as an empty notification without this. */}
            {n.imageUrl ? <Image source={{ uri: n.imageUrl }} style={styles.image} /> : null}
            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>{relativeTime(n.createdAt)}</Text>
              {n.projectName ? (
                <View style={styles.projectTag}>
                  <FolderKanban size={9} color={colors.muted} />
                  <Text style={styles.metaText}>{n.projectName}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  title: { color: colors.foreground, fontSize: 20, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  markAll: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderColor: colors.border, borderWidth: 1, borderRadius: 9,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  markAllText: { color: colors.blue, fontSize: 11, fontWeight: '600' },
  card: {
    backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    borderRadius: 12, padding: 12, marginBottom: 8,
  },
  cardUnread: { borderColor: colors.blue, backgroundColor: colors.cardAlt },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { color: colors.foreground, fontSize: 13, fontWeight: '700', flex: 1 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.blue },
  cardBody: { color: colors.muted, fontSize: 12, marginTop: 5, lineHeight: 18 },
  image: { width: '100%', height: 150, borderRadius: 9, marginTop: 8, resizeMode: 'cover' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  projectTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: colors.muted, fontSize: 10 },
  emptyBox: { alignItems: 'center', gap: 8, paddingVertical: 50 },
  empty: { color: colors.muted, fontSize: 12 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.35)',
    borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12,
  },
  errorText: { color: colors.red, flex: 1, fontSize: 12 },
});
