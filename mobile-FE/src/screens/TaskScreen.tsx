import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, Image,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { AlertTriangle, Send, Sparkles, UserPlus, Timer, ImagePlus, X } from 'lucide-react-native';
import {
  assignmentApi, commentApi, CommentDto, projectApi, taskApi, TaskDto, userApi,
} from '../api';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme';

const STATUS_FLOW = [
  { status: 'Todo', label: 'Cần làm' },
  { status: 'InProgress', label: 'Đang làm' },
  { status: 'InReview', label: 'Chờ duyệt' },
  { status: 'Done', label: 'Xong' },
];

const RISK_COLOR: Record<string, string> = {
  CRITICAL: colors.red, HIGH: colors.red, MEDIUM: colors.yellow, LOW: colors.green,
};

interface Recommendation {
  userId: number;
  userName?: string | null;
  name?: string | null;
  totalScore?: number;
  score?: number;
}

export default function TaskScreen() {
  const route = useRoute<any>();
  const { taskId } = route.params ?? {};
  const { user } = useAuth();

  const [task, setTask] = useState<TaskDto | null>(null);
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);

  const [draft, setDraft] = useState('');
  // Held until the comment is posted, so text and image arrive as one comment.
  const [draftImage, setDraftImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const detail = await taskApi.getById(taskId);
      setTask(detail);
      setComments(await commentApi.byTask(taskId).catch(() => []));

      // Whether the assign controls appear is the API's answer, not a guess from the user's role.
      if (detail.projectId != null) {
        const project = await projectApi.getById(detail.projectId).catch(() => null);
        setCanManage(!!project?.canManageTasks);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được công việc.');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (key: string, action: () => Promise<void>, success?: string) => {
    if (busy) return;
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (success) setNotice(success);
    } catch (err: any) {
      setError(err?.message ?? 'Thao tác thất bại.');
    } finally {
      setBusy(null);
    }
  };

  const changeStatus = (status: string) =>
    task && run('status', async () => {
      const updated = await taskApi.updateProgress(task.taskId, {
        status,
        progress: status === 'Done' ? 100 : status === 'Todo' ? 0 : task.progress ?? 0,
      });
      setTask(updated?.taskId ? updated : task);
      await load();
    });

  const addComment = () =>
    task && run('comment', async () => {
      await commentApi.create(task.taskId, draft.trim(), draftImage);
      setDraft('');
      setDraftImage(null);
      setComments(await commentApi.byTask(task.taskId));
    });

  /** Uploads straight away so the author sees the picture before committing to the comment. */
  const attachImage = () =>
    run('upload', async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Cần quyền truy cập thư viện ảnh.');

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (picked.canceled || !picked.assets?.[0]) return;

      const asset = picked.assets[0];
      const { imageUrl } = await userApi.uploadImage(asset.uri, asset.fileName ?? 'comment.jpg');
      setDraftImage(imageUrl);
    });

  const estimate = () =>
    task && run('estimate', async () => {
      const updated = await taskApi.estimate(task.taskId);
      setTask(updated ?? task);
    }, 'Đã ước tính lại.');

  const suggest = () =>
    task?.projectId != null && run('suggest', async () => {
      const rows = await assignmentApi.recommend(task.taskId, task.projectId!);
      setRecommendations(Array.isArray(rows) ? rows.slice(0, 3) : []);
    });

  const assign = (userId: number) =>
    task && run(`assign-${userId}`, async () => {
      await assignmentApi.accept(task.taskId, userId);
      setRecommendations(null);
      await load();
    }, 'Đã giao việc.');

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.blue} /></View>;
  }

  if (!task) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Không tìm thấy công việc.'}</Text>
      </View>
    );
  }

  const risk = (task.riskLevel ?? 'LOW').toUpperCase();

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Text style={styles.title}>{task.title ?? 'Không tên'}</Text>
          <View style={[styles.riskChip, { backgroundColor: `${RISK_COLOR[risk] ?? colors.green}22` }]}>
            <Text style={[styles.riskText, { color: RISK_COLOR[risk] ?? colors.green }]}>{risk}</Text>
          </View>
        </View>
        {task.description ? <Text style={styles.description}>{task.description}</Text> : null}

        {error && (
          <View style={styles.errorBox}>
            <AlertTriangle size={14} color={colors.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {notice && <Text style={styles.notice}>{notice}</Text>}

        {/* Status: anyone on the project may move their own work along. */}
        <Text style={styles.sectionTitle}>Trạng thái</Text>
        <View style={styles.statusRow}>
          {STATUS_FLOW.map((s) => {
            const active = (task.status ?? 'Todo') === s.status;
            return (
              <Pressable
                key={s.status}
                onPress={() => changeStatus(s.status)}
                disabled={active || busy === 'status'}
                style={[styles.statusChip, active && styles.statusChipActive]}
              >
                <Text style={[styles.statusText, active && styles.statusTextActive]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Chi tiết</Text>
        <View style={styles.detailCard}>
          <Detail label="Loại" value={task.taskTypeName ?? '—'} />
          <Detail label="Ưu tiên" value={task.priority ?? '—'} />
          <Detail label="Hạn" value={task.deadline ?? '—'} />
          <Detail
            label="Ước tính"
            value={
              task.estimatedTime
                ? `${task.estimatedTime}h`
                : task.aiEstimatedTime
                  ? `${task.aiEstimatedTime}h (AI)`
                  : '—'
            }
          />
          <Detail label="Độ khó" value={task.difficulty ? `${task.difficulty}/5` : '—'} />
          <Detail label="Người làm" value={task.assignees?.[0]?.userName ?? 'Chưa giao'} />
        </View>

        <Pressable onPress={estimate} disabled={busy === 'estimate'} style={styles.aiButton}>
          {busy === 'estimate'
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Timer size={14} color={colors.white} />}
          <Text style={styles.aiButtonText}>Ước tính bằng AI</Text>
        </Pressable>

        {/* Assigning is a leader's call, and the API enforces the same rule. */}
        {canManage && (
          <>
            <Pressable onPress={suggest} disabled={busy === 'suggest'} style={styles.secondaryButton}>
              {busy === 'suggest'
                ? <ActivityIndicator color={colors.blue} size="small" />
                : <Sparkles size={14} color={colors.blue} />}
              <Text style={styles.secondaryButtonText}>Gợi ý người phù hợp</Text>
            </Pressable>

            {recommendations?.map((r) => (
              <View key={r.userId} style={styles.recRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recName}>{r.userName ?? r.name ?? `User ${r.userId}`}</Text>
                  <Text style={styles.metaText}>
                    Điểm phù hợp {Math.round(r.totalScore ?? r.score ?? 0)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => assign(r.userId)}
                  disabled={busy === `assign-${r.userId}`}
                  style={styles.assignButton}
                >
                  <UserPlus size={12} color={colors.white} />
                  <Text style={styles.assignText}>Giao</Text>
                </Pressable>
              </View>
            ))}
            {recommendations?.length === 0 && (
              <Text style={styles.empty}>Chưa có ứng viên phù hợp trong nhóm.</Text>
            )}
          </>
        )}

        <Text style={styles.sectionTitle}>Bình luận ({comments.length})</Text>
        {comments.length === 0 && <Text style={styles.empty}>Chưa có bình luận.</Text>}
        {comments.map((c) => {
          const mine = c.userId === user?.userId;
          return (
            <View key={c.commentId} style={[styles.comment, mine && styles.commentMine]}>
              <View style={styles.commentHead}>
                {c.userAvatar ? (
                  <Image source={{ uri: c.userAvatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>
                      {(c.userName ?? 'U').trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.commentAuthor}>
                  {c.userName ?? `User ${c.userId}`}{mine ? ' · Bạn' : ''}
                </Text>
              </View>
              {c.content ? <Text style={styles.commentBody}>{c.content}</Text> : null}
              {c.imageUrl ? <Image source={{ uri: c.imageUrl }} style={styles.commentImage} /> : null}
            </View>
          );
        })}

        {draftImage && (
          <View style={styles.attachRow}>
            <Image source={{ uri: draftImage }} style={styles.attachThumb} />
            <Text style={styles.metaText}>Ảnh sẽ gửi kèm bình luận này.</Text>
            <Pressable onPress={() => setDraftImage(null)} style={styles.iconButton}>
              <X size={13} color={colors.muted} />
            </Pressable>
          </View>
        )}

        <View style={styles.composer}>
          <Pressable onPress={attachImage} disabled={busy === 'upload'} style={styles.attachButton}>
            {busy === 'upload'
              ? <ActivityIndicator color={colors.muted} size="small" />
              : <ImagePlus size={16} color={colors.muted} />}
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Viết bình luận..."
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
          />
          <Pressable
            onPress={addComment}
            disabled={(!draft.trim() && !draftImage) || busy === 'comment'}
            style={[styles.sendButton, (!draft.trim() && !draftImage) && styles.disabled]}
          >
            {busy === 'comment'
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Send size={16} color={colors.white} />}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const Detail = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 20 },
  content: { padding: 16, paddingBottom: 140 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { color: colors.foreground, fontSize: 18, fontWeight: '700', flex: 1 },
  description: { color: colors.muted, fontSize: 13, marginTop: 6, lineHeight: 19 },
  riskChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  riskText: { fontSize: 10, fontWeight: '800' },
  sectionTitle: { color: colors.foreground, fontSize: 13, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  statusChip: {
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
  },
  statusChipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  statusText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  statusTextActive: { color: colors.white },
  detailCard: {
    backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 12,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomColor: colors.border, borderBottomWidth: 1,
  },
  detailLabel: { color: colors.muted, fontSize: 12 },
  detailValue: { color: colors.foreground, fontSize: 12, fontWeight: '600' },
  aiButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: colors.purple, borderRadius: 11, paddingVertical: 12, marginTop: 14,
  },
  aiButtonText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  secondaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: colors.card, borderColor: colors.blue, borderWidth: 1,
    borderRadius: 11, paddingVertical: 12, marginTop: 9,
  },
  secondaryButtonText: { color: colors.blue, fontWeight: '700', fontSize: 13 },
  recRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    borderRadius: 11, padding: 11, marginTop: 8,
  },
  recName: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
  assignButton: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.blue, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 7,
  },
  assignText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  comment: {
    backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    borderRadius: 11, padding: 11, marginBottom: 8,
  },
  commentMine: { borderColor: colors.blue },
  commentHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  avatar: { width: 24, height: 24, borderRadius: 12 },
  avatarFallback: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  commentAuthor: { color: colors.foreground, fontSize: 12, fontWeight: '700' },
  commentBody: { color: colors.foreground, fontSize: 13, lineHeight: 19 },
  commentImage: { width: '100%', height: 180, borderRadius: 9, marginTop: 8, resizeMode: 'cover' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 12 },
  attachRow: {
    flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12,
    backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    borderRadius: 11, padding: 9,
  },
  attachThumb: { width: 44, height: 44, borderRadius: 8 },
  attachButton: {
    borderColor: colors.border, borderWidth: 1, borderRadius: 11,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  iconButton: { padding: 4 },
  input: {
    flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10,
    color: colors.foreground, fontSize: 13, maxHeight: 120,
  },
  sendButton: {
    backgroundColor: colors.blue, borderRadius: 11, padding: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  metaText: { color: colors.muted, fontSize: 11 },
  empty: { color: colors.muted, fontSize: 12, paddingVertical: 10 },
  notice: { color: colors.green, fontSize: 12, marginTop: 10 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.35)',
    borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 12,
  },
  errorText: { color: colors.red, flex: 1, fontSize: 12 },
});
