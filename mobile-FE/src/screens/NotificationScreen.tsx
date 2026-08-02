import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  AlertTriangle, Bell, Check, ClipboardCheck, ExternalLink, Eye, FolderKanban,
  MessageSquare, ShieldAlert, Trash2, UserPlus, X,
} from 'lucide-react-native';
import { invitationApi, notificationApi, NotificationDto } from '../api';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme';

const TYPE_META: Record<string, { label: string; color: string; Icon: typeof Bell }> = {
  COMMENT: { label: 'Bình luận', color: colors.blue, Icon: MessageSquare },
  TASK_ASSIGNED: { label: 'Giao việc', color: colors.purpleLight, Icon: ClipboardCheck },
  TASK_REVIEW: { label: 'Chờ review', color: colors.yellow, Icon: Eye },
  TASK_RISK: { label: 'Cảnh báo rủi ro', color: colors.red, Icon: ShieldAlert },
  RISK: { label: 'Cảnh báo rủi ro', color: colors.red, Icon: ShieldAlert },
  INVITATION: { label: 'Lời mời', color: colors.green, Icon: UserPlus },
};

function absoluteTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short' });
}

/**
 * One notification, in full.
 *
 * Tapping used to jump straight to the task, which threw away the message — and a comment that was
 * mostly a screenshot arrived as an apparently empty notification. This shows what was actually
 * said, and the attached picture, before offering to go anywhere.
 */
export default function NotificationScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { notificationId } = route.params ?? {};

  const [item, setItem] = useState<NotificationDto | null>(route.params?.notification ?? null);
  const [loading, setLoading] = useState(!route.params?.notification);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The invitation itself, not the notification about it — that is what carries the decision.
  const [invitation, setInvitation] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (user?.userId == null) return;
    try {
      // There is no single-notification endpoint; the list is the source and it is already small.
      const rows = await notificationApi.list(user.userId);
      const found = Array.isArray(rows)
        ? rows.find((r) => r.notificationId === notificationId) ?? null
        : null;
      if (found) setItem(found);
      else if (!item) setError('Không tìm thấy thông báo này.');
    } catch (err: any) {
      if (!item) setError(err?.message ?? 'Không tải được thông báo.');
    } finally {
      setLoading(false);
    }
  }, [user?.userId, notificationId, item]);

  useEffect(() => {
    void load();
    // Opening it is what marks it read, the same gesture an email client uses.
    if (notificationId != null) void notificationApi.markRead(notificationId).catch(() => undefined);
  }, [notificationId]);

  // A notification about an invitation references the invitation id; only a still-pending one can
  // be answered, so an already-decided invite simply shows no buttons.
  useEffect(() => {
    if ((item?.type ?? '').toUpperCase() !== 'INVITATION' || !user?.email) return;
    void invitationApi
      .mine(user.email)
      .then((rows) => {
        const match = Array.isArray(rows)
          ? rows.find(
              (r) => r.invitationId === item?.referenceId && (r.status ?? 'Pending') === 'Pending'
            )
          : null;
        setInvitation(match ?? null);
      })
      .catch(() => setInvitation(null));
  }, [item?.type, item?.referenceId, user?.email]);

  const respond = async (status: 'Accepted' | 'Rejected') => {
    if (!invitation || busy) return;
    setBusy(true);
    setError(null);
    try {
      await invitationApi.respond(invitation.invitationId, status);
      setInvitation(null);
      setNotice(status === 'Accepted' ? 'Bạn đã tham gia nhóm.' : 'Đã từ chối lời mời.');
    } catch (err: any) {
      setError(err?.message ?? 'Không phản hồi được lời mời.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (notificationId == null) return;
    try {
      await notificationApi.remove(notificationId);
      navigation.goBack();
    } catch (err: any) {
      setError(err?.message ?? 'Không xóa được thông báo.');
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.blue} /></View>;
  }

  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Không tìm thấy thông báo.'}</Text>
      </View>
    );
  }

  const meta = TYPE_META[(item.type ?? '').toUpperCase()] ?? {
    label: 'Thông báo',
    color: colors.muted,
    Icon: Bell,
  };
  const Icon = meta.Icon;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Icon size={20} color={meta.color} />
        <Text style={styles.title}>{item.title ?? 'Thông báo'}</Text>
        <Pressable onPress={remove} style={styles.iconButton}>
          <Trash2 size={16} color={colors.red} />
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        <View style={[styles.typeChip, { backgroundColor: `${meta.color}22` }]}>
          <Text style={[styles.typeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <Text style={styles.metaText}>{absoluteTime(item.createdAt)}</Text>
      </View>

      {item.projectName ? (
        <View style={styles.projectRow}>
          <FolderKanban size={12} color={colors.muted} />
          <Text style={styles.metaText}>{item.projectName}</Text>
        </View>
      ) : null}

      {error && (
        <View style={styles.errorBox}>
          <AlertTriangle size={14} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {item.message ? <Text style={styles.body}>{item.message}</Text> : null}

      {/* Deciding is the whole point of an invitation, so it gets the primary action. */}
      {invitation && (
        <View style={styles.inviteBox}>
          <Text style={styles.inviteText}>
            Tham gia <Text style={styles.inviteTeam}>{invitation.teamName ?? `nhóm #${invitation.teamId}`}</Text>?
          </Text>
          <View style={styles.inviteActions}>
            <Pressable onPress={() => respond('Accepted')} disabled={busy} style={styles.acceptButton}>
              {busy ? <ActivityIndicator color={colors.white} size="small" /> : <Check size={14} color={colors.white} />}
              <Text style={styles.primaryText}>Chấp nhận</Text>
            </Pressable>
            <Pressable onPress={() => respond('Rejected')} disabled={busy} style={styles.declineButton}>
              <X size={14} color={colors.muted} />
              <Text style={styles.declineText}>Từ chối</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* The picture a comment was really about. */}
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : null}

      <View style={styles.actions}>
        {item.referenceType === 'TASK' && item.referenceId != null && (
          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.navigate('TaskDetail', { taskId: item.referenceId })}
          >
            <ExternalLink size={14} color={colors.white} />
            <Text style={styles.primaryText}>Mở công việc</Text>
          </Pressable>
        )}

        {item.projectId != null && (
          <Pressable
            style={styles.secondaryButton}
            onPress={() =>
              navigation.navigate('ProjectTasks', {
                projectId: item.projectId,
                projectName: item.projectName,
              })
            }
          >
            <FolderKanban size={14} color={colors.blue} />
            <Text style={styles.secondaryText}>Mở dự án</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 20 },
  content: { padding: 16, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { color: colors.foreground, fontSize: 17, fontWeight: '700', flex: 1 },
  iconButton: { padding: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10, flexWrap: 'wrap' },
  typeChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  typeText: { fontSize: 10, fontWeight: '700' },
  projectRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  metaText: { color: colors.muted, fontSize: 11 },
  body: { color: colors.foreground, fontSize: 14, lineHeight: 21, marginTop: 16 },
  image: {
    width: '100%', height: 260, borderRadius: 12, marginTop: 14,
    borderColor: colors.border, borderWidth: 1,
  },
  notice: { color: colors.green, fontSize: 12, marginTop: 12 },
  inviteBox: {
    marginTop: 18, padding: 14, borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.35)', borderWidth: 1,
  },
  inviteText: { color: colors.foreground, fontSize: 13 },
  inviteTeam: { fontWeight: '700' },
  inviteActions: { flexDirection: 'row', gap: 9, marginTop: 12 },
  acceptButton: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: colors.blue, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11,
  },
  declineButton: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderColor: colors.border, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 11,
  },
  declineText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  actions: { gap: 9, marginTop: 24 },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.blue, borderRadius: 11, paddingVertical: 13,
  },
  primaryText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  secondaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.card, borderColor: colors.blue, borderWidth: 1,
    borderRadius: 11, paddingVertical: 13,
  },
  secondaryText: { color: colors.blue, fontWeight: '700', fontSize: 13 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.35)',
    borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 12,
  },
  errorText: { color: colors.red, flex: 1, fontSize: 12 },
});
