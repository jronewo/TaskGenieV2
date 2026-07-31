import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Bell, CheckCircle2, AlertTriangle, MessageSquare,
  UserPlus, Calendar, Sparkles, X,
} from 'lucide-react-native';
import { colors } from '../theme';
import { ApiError, notificationsApi, type AppNotification } from '../api';
import { useApiQuery, useRefetchOnFocus } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState, ErrorState, EmptyState } from '../components/StateViews';
import { timeAgo } from '../utils/task';

type FilterId = 'all' | 'unread';

interface Appearance {
  icon: typeof Bell;
  color: string;
  bg: string;
}

/** Types the backend emits today are COMMENT-based; the rest are future-proofing. */
function appearanceFor(type: string | null): Appearance {
  const key = (type ?? '').toUpperCase();
  if (key.includes('COMMENT')) return { icon: MessageSquare, color: '#60A5FA', bg: 'rgba(41,98,255,0.12)' };
  if (key.includes('RISK') || key.includes('AI')) return { icon: Sparkles, color: colors.purpleLight, bg: 'rgba(124,77,255,0.12)' };
  if (key.includes('COMPLET') || key.includes('DONE')) return { icon: CheckCircle2, color: colors.green, bg: 'rgba(16,185,129,0.12)' };
  if (key.includes('DEADLINE') || key.includes('LATE')) return { icon: AlertTriangle, color: colors.yellow, bg: 'rgba(245,158,11,0.12)' };
  if (key.includes('TEAM') || key.includes('INVIT')) return { icon: UserPlus, color: '#818CF8', bg: 'rgba(99,102,241,0.12)' };
  if (key.includes('MEETING')) return { icon: Calendar, color: '#34D399', bg: 'rgba(52,211,153,0.12)' };
  return { icon: Bell, color: colors.muted, bg: 'rgba(93,126,166,0.12)' };
}

function FadeSlide({ children, delay }: { children: React.ReactNode; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const userId = session?.userId;

  const [filter, setFilter] = useState<FilterId>('all');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const { data, error, isLoading, isRefreshing, refetch } = useApiQuery(
    signal => notificationsApi.getForUser(userId!, signal),
    [userId],
    { enabled: userId !== undefined },
  );
  useRefetchOnFocus(refetch, userId !== undefined);

  // Local overlay so a tap feels instant; the server list wins on the next fetch.
  const [readOverride, setReadOverride] = useState<Record<number, true>>({});
  const [dismissed, setDismissed] = useState<Record<number, true>>({});

  const items = useMemo(
    () =>
      (data ?? [])
        .filter(n => !dismissed[n.notificationId])
        .map(n => (readOverride[n.notificationId] ? { ...n, isRead: true } : n)),
    [data, readOverride, dismissed],
  );

  const unreadCount = items.filter(n => !n.isRead).length;
  const filtered = filter === 'unread' ? items.filter(n => !n.isRead) : items;

  const markRead = useCallback(async (notification: AppNotification) => {
    if (notification.isRead) return;
    setReadOverride(prev => ({ ...prev, [notification.notificationId]: true }));
    try {
      await notificationsApi.markAsRead(notification.notificationId);
    } catch {
      // Roll back so the badge stays truthful.
      setReadOverride(prev => {
        const next = { ...prev };
        delete next[notification.notificationId];
        return next;
      });
    }
  }, []);

  const openNotification = useCallback(
    (notification: AppNotification) => {
      void markRead(notification);
      if (notification.referenceType === 'TASK' && notification.referenceId != null) {
        navigation.navigate('TaskDetail', { taskId: notification.referenceId });
      }
    },
    [markRead, navigation],
  );

  const dismiss = useCallback(async (notification: AppNotification) => {
    setDismissed(prev => ({ ...prev, [notification.notificationId]: true }));
    try {
      await notificationsApi.remove(notification.notificationId);
    } catch (err) {
      setDismissed(prev => {
        const next = { ...prev };
        delete next[notification.notificationId];
        return next;
      });
      Alert.alert('Không xoá được', err instanceof ApiError ? err.message : 'Đã xảy ra lỗi.');
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (userId === undefined || unreadCount === 0) return;
    setIsBulkUpdating(true);
    try {
      await notificationsApi.markAllAsRead(userId);
      refetch();
    } catch (err) {
      Alert.alert('Thất bại', err instanceof ApiError ? err.message : 'Đã xảy ra lỗi.');
    } finally {
      setIsBulkUpdating(false);
    }
  }, [userId, unreadCount, refetch]);

  const clearAll = useCallback(() => {
    if (items.length === 0) return;
    Alert.alert('Xoá tất cả', `Xoá ${items.length} thông báo?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          setIsBulkUpdating(true);
          // The API only deletes one at a time, so fan out and refetch once.
          const results = await Promise.allSettled(
            items.map(n => notificationsApi.remove(n.notificationId)),
          );
          const failed = results.filter(r => r.status === 'rejected').length;
          if (failed > 0) Alert.alert('Chưa xoá hết', `${failed} thông báo không xoá được.`);
          setDismissed({});
          setIsBulkUpdating(false);
          refetch();
        },
      },
    ]);
  }, [items, refetch]);

  const filters: { id: FilterId; label: string; count: number }[] = [
    { id: 'all', label: 'Tất cả', count: items.length },
    { id: 'unread', label: 'Chưa đọc', count: unreadCount },
  ];

  const renderBody = () => {
    if (isLoading) return <LoadingState label="Đang tải thông báo…" />;
    if (error) return <ErrorState error={error} onRetry={refetch} />;
    if (filtered.length === 0) {
      return (
        <View style={s.emptyCard}>
          <Bell size={40} color={colors.muted} strokeWidth={1.5} />
          <Text style={[s.mutedSm, { marginTop: 12 }]}>
            {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refetch} tintColor={colors.blue} />
      }
    >
      {/* Header */}
      <View style={s.headerRow}>
        <View>
          <Text style={s.subtitle}>Hộp thư</Text>
          <View style={s.row}>
            <Text style={s.title}>Thông báo</Text>
            {unreadCount > 0 && (
              <View style={s.unreadBadge}>
                <Text style={s.unreadText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Filter pills */}
      <View style={[s.row, { justifyContent: 'flex-start', gap: 8, marginBottom: 16 }]}>
        {filters.map(f => {
          const isActive = filter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={[s.filterPill, { backgroundColor: isActive ? colors.blue : 'rgba(17,30,53,0.8)', borderColor: isActive ? 'transparent' : colors.border }]}
            >
              <Text style={[s.filterText, { color: isActive ? '#fff' : colors.muted }]}>{f.label}</Text>
              <View style={[s.filterCount, { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)' }]}>
                <Text style={[s.filterCountText, { color: isActive ? '#fff' : colors.muted }]}>{f.count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Action buttons */}
      <View style={[s.row, { gap: 8, marginBottom: 16 }]}>
        <TouchableOpacity
          style={[s.actionBtn, { flex: 1, opacity: unreadCount && !isBulkUpdating ? 1 : 0.5 }]}
          onPress={markAllRead}
          disabled={!unreadCount || isBulkUpdating}
        >
          <Text style={s.actionText}>Đánh dấu đã đọc</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, { flex: 1, opacity: items.length && !isBulkUpdating ? 1 : 0.5 }]}
          onPress={clearAll}
          disabled={!items.length || isBulkUpdating}
        >
          <Text style={[s.actionText, { color: colors.muted }]}>Xoá tất cả</Text>
        </TouchableOpacity>
      </View>

      {renderBody()}

      {filtered.map((n, i) => {
        const { icon: Icon, color, bg } = appearanceFor(n.type);
        return (
          <FadeSlide key={n.notificationId} delay={i * 40}>
            <TouchableOpacity
              style={[s.notifCard, { borderColor: n.isRead ? colors.border : 'rgba(41,98,255,0.25)' }]}
              onPress={() => openNotification(n)}
              activeOpacity={0.8}
            >
              {!n.isRead && <View style={s.unreadStripe} />}
              <View style={{ flex: 1, padding: 16 }}>
                <View style={s.rowStart}>
                  <View style={[s.iconBox, { backgroundColor: bg }]}>
                    <Icon size={16} color={color} strokeWidth={1.75} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={[s.row, { marginBottom: 4 }]}>
                      <View style={[s.row, { flex: 1 }]}>
                        <Text style={s.notifTitle} numberOfLines={1}>{n.title}</Text>
                        {!n.isRead && <View style={s.dot} />}
                      </View>
                      <TouchableOpacity onPress={() => dismiss(n)} hitSlop={8}>
                        <X size={14} color={colors.muted} />
                      </TouchableOpacity>
                    </View>
                    {!!n.message && (
                      <Text style={[s.mutedXs, { lineHeight: 18, marginBottom: 8 }]}>{n.message}</Text>
                    )}
                    <Text style={[s.mutedXs, { opacity: 0.7 }]}>{timeAgo(n.createdAt)}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </FadeSlide>
        );
      })}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:        { flex: 1, backgroundColor: colors.bg },
  content:       { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  subtitle:      { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  title:         { fontSize: 26, fontWeight: '700', color: colors.foreground },
  row:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowStart:      { flexDirection: 'row', alignItems: 'flex-start' },
  iconBox:       { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filterPill:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, gap: 6 },
  filterText:    { fontSize: 12, fontWeight: '600' },
  filterCount:   { minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  filterCountText: { fontSize: 10, fontWeight: '600' },
  actionBtn:     { backgroundColor: 'rgba(17,30,53,0.8)', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  actionText:    { fontSize: 12, fontWeight: '600', color: colors.foreground },
  notifCard:     { backgroundColor: colors.card, borderWidth: 1, borderRadius: 16, flexDirection: 'row', overflow: 'hidden', marginBottom: 10 },
  unreadStripe:  { width: 3, backgroundColor: colors.blue },
  notifTitle:    { fontSize: 13, fontWeight: '600', color: colors.foreground, flexShrink: 1 },
  dot:           { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.blue },
  unreadBadge:   { backgroundColor: colors.blue, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  unreadText:    { fontSize: 11, fontWeight: '600', color: '#fff' },
  emptyCard:     { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 48, alignItems: 'center' },
  mutedSm:       { fontSize: 13, color: colors.muted },
  mutedXs:       { fontSize: 12, color: colors.muted },
});
