import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Animated, StyleSheet, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Calendar, AlertTriangle, MessageSquare, Send,
  ChevronDown, ChevronUp, Clock, TrendingUp, Sparkles, Link2, RefreshCw,
} from 'lucide-react-native';
import { colors } from '../theme';
import {
  ApiError, aiApi, commentsApi, tasksApi,
  type RiskAssessment, type TaskComment, type TaskDetail,
} from '../api';
import { useApiQuery, useRefetchOnFocus } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState, ErrorState } from '../components/StateViews';
import { gradientFor, getInitials } from '../utils/avatar';
import {
  priorityStyle, statusLabel, riskPercent, formatDeadline, primaryAssignee, timeAgo,
  TASK_STATUSES, type KnownStatus,
} from '../utils/task';

function AnimatedBar({ progress, color }: { progress: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: progress, duration: 1000, useNativeDriver: false }).start();
  }, [progress]);
  return (
    <View style={s.barTrack}>
      <Animated.View style={[s.barFill, { backgroundColor: color, width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

function Accordion({ title, children, defaultOpen = true, accent = false, badge }: {
  title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; accent?: boolean; badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={[s.card, accent ? { backgroundColor: 'rgba(124,77,255,0.05)', borderColor: 'rgba(124,77,255,0.2)' } : {}]}>
      <TouchableOpacity style={s.accordionHeader} onPress={() => setOpen(o => !o)}>
        <View style={s.row}>{typeof title === 'string' ? <Text style={s.cardTitle}>{title}</Text> : title}{badge}</View>
        {open ? <ChevronUp size={16} color={colors.muted} /> : <ChevronDown size={16} color={colors.muted} />}
      </TouchableOpacity>
      {open && <View style={s.accordionBody}>{children}</View>}
    </View>
  );
}

export default function TaskDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { session } = useAuth();
  const taskId: number | undefined = route.params?.taskId;

  const [draftComment, setDraftComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const taskQuery = useApiQuery<TaskDetail>(
    signal => tasksApi.getById(taskId!, signal),
    [taskId],
    { enabled: taskId !== undefined },
  );
  useRefetchOnFocus(taskQuery.refetch, taskId !== undefined);

  const commentsQuery = useApiQuery<TaskComment[]>(
    signal => commentsApi.getByTask(taskId!, signal),
    [taskId],
    { enabled: taskId !== undefined },
  );

  const riskQuery = useApiQuery<RiskAssessment[]>(
    signal => aiApi.getRiskHistory(taskId!, signal),
    [taskId],
    { enabled: taskId !== undefined },
  );

  const task = taskQuery.data;
  const comments = useMemo(() => commentsQuery.data ?? [], [commentsQuery.data]);
  // The history endpoint returns every run; the most recent one is the current view.
  const latestRisk = useMemo(() => {
    const history = riskQuery.data ?? [];
    return [...history].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  }, [riskQuery.data]);

  const runAnalysis = useCallback(async () => {
    if (!taskId) return;
    setIsAnalyzing(true);
    try {
      await aiApi.analyzeTaskRisk(taskId);
      riskQuery.refetch();
      taskQuery.refetch();
    } catch (err) {
      Alert.alert('Phân tích thất bại', err instanceof ApiError ? err.message : 'Đã xảy ra lỗi.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [taskId, riskQuery, taskQuery]);

  const changeStatus = useCallback(
    async (status: KnownStatus) => {
      if (!taskId || !task) return;
      setIsChangingStatus(true);
      try {
        await tasksApi.updateProgress(taskId, {
          status,
          progress: status === 'Done' ? 100 : task.progress,
        });
        taskQuery.refetch();
      } catch (err) {
        Alert.alert(
          'Không thể đổi trạng thái',
          err instanceof ApiError ? err.message : 'Đã xảy ra lỗi.',
        );
      } finally {
        setIsChangingStatus(false);
      }
    },
    [taskId, task, taskQuery],
  );

  const postComment = useCallback(async () => {
    const content = draftComment.trim();
    if (!taskId || !session || content.length === 0) return;
    setIsPostingComment(true);
    try {
      await commentsApi.create(taskId, session.userId, content);
      setDraftComment('');
      commentsQuery.refetch();
    } catch (err) {
      Alert.alert('Không gửi được bình luận', err instanceof ApiError ? err.message : 'Đã xảy ra lỗi.');
    } finally {
      setIsPostingComment(false);
    }
  }, [draftComment, taskId, session, commentsQuery]);

  if (taskId === undefined) {
    return (
      <View style={s.centered}>
        <Text style={s.mutedXs}>Không xác định được task.</Text>
      </View>
    );
  }

  if (taskQuery.isLoading) {
    return (
      <View style={s.centered}>
        <LoadingState label="Đang tải chi tiết task…" />
      </View>
    );
  }

  if (taskQuery.error || !task) {
    return (
      <View style={s.centered}>
        <ErrorState
          error={taskQuery.error ?? new ApiError('Không tìm thấy task.', 404)}
          onRetry={taskQuery.refetch}
        />
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={16} color={colors.foreground} />
        </TouchableOpacity>
      </View>
    );
  }

  const pCfg = priorityStyle(task.priority);
  const assignee = primaryAssignee(task);
  const progress = task.progress ?? 0;
  const doneDependencies = task.dependencies.filter(d => d.status === 'Done').length;
  const risk = latestRisk ? Math.round(latestRisk.totalScore) : riskPercent(task.riskLevel);
  const riskBand = latestRisk?.riskLevel ?? task.riskLevel ?? 'LOW';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Sticky header */}
      <View style={s.stickyHeader}>
        <View style={[s.row, { marginBottom: 16 }]}>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={16} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={runAnalysis} disabled={isAnalyzing}>
            {isAnalyzing
              ? <ActivityIndicator size="small" color={colors.foreground} />
              : <RefreshCw size={16} color={colors.foreground} />}
          </TouchableOpacity>
        </View>
        <View style={[s.rowStart, { marginBottom: 8, gap: 8 }]}>
          <View style={[s.badge, { backgroundColor: pCfg.badgeBg }]}>
            <Text style={[s.badgeText, { color: pCfg.badgeColor }]}>{task.priority ?? 'Medium'} Priority</Text>
          </View>
          <View style={[s.badge, { backgroundColor: 'rgba(41,98,255,0.12)' }]}>
            <Text style={[s.badgeText, { color: '#60A5FA' }]}>{statusLabel(task.status)}</Text>
          </View>
        </View>
        <Text style={s.mainTitle}>{task.title}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={taskQuery.isRefreshing}
            onRefresh={taskQuery.refetch}
            tintColor={colors.blue}
          />
        }
      >
        {/* Progress */}
        <View style={s.card}>
          <View style={[s.row, { marginBottom: 12 }]}>
            <Text style={s.mutedXs}>Tiến độ tổng thể</Text>
            <Text style={s.bigNum}>{progress}%</Text>
          </View>
          <AnimatedBar progress={progress} color={pCfg.stripe} />
          <View style={[s.row, { marginTop: 8 }]}>
            <Text style={s.mutedXs}>
              {task.dependencies.length > 0
                ? `${doneDependencies}/${task.dependencies.length} phụ thuộc đã xong`
                : 'Không có phụ thuộc'}
            </Text>
            <Text style={s.mutedXs}>Hạn {formatDeadline(task.deadline)}</Text>
          </View>
        </View>

        {/* Status switcher */}
        <View style={s.statusRow}>
          {TASK_STATUSES.map(status => {
            const isActive = task.status === status;
            return (
              <TouchableOpacity
                key={status}
                style={[
                  s.statusBtn,
                  {
                    backgroundColor: isActive ? colors.blue : 'rgba(255,255,255,0.04)',
                    borderColor: isActive ? 'transparent' : colors.border,
                  },
                ]}
                onPress={() => !isActive && changeStatus(status)}
                disabled={isChangingStatus}
              >
                <Text style={[s.statusText, { color: isActive ? '#fff' : colors.muted }]}>
                  {statusLabel(status)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Risk alert */}
        {risk >= 50 && (
          <View style={[s.card, { backgroundColor: 'rgba(239,68,68,0.07)', borderColor: 'rgba(239,68,68,0.25)' }]}>
            <View style={s.rowStart}>
              <View style={[s.iconBox, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                <AlertTriangle size={16} color={colors.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, { marginBottom: 4 }]}>
                  Rủi ro {riskBand}{latestRisk ? ` · ${risk} điểm` : ''}
                </Text>
                <Text style={s.mutedXs}>
                  {latestRisk?.explanation ?? 'Chạy phân tích AI để xem lý do chi tiết.'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick meta */}
        <View style={s.grid2}>
          <View style={[s.card, { flex: 1, marginRight: 6 }]}>
            <Text style={[s.mutedXs, { marginBottom: 8 }]}>NGƯỜI PHỤ TRÁCH</Text>
            {assignee ? (
              <View style={s.rowStart}>
                <LinearGradient colors={gradientFor(assignee.userName)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatarSm}>
                  <Text style={s.avatarSmText}>{getInitials(assignee.userName)}</Text>
                </LinearGradient>
                <Text style={[s.cardTitle, { fontSize: 13, marginLeft: 8 }]} numberOfLines={1}>{assignee.userName}</Text>
              </View>
            ) : (
              <Text style={s.mutedXs}>Chưa giao</Text>
            )}
          </View>
          <View style={[s.card, { flex: 1, marginLeft: 6 }]}>
            <View style={[s.row, { marginBottom: 8 }]}>
              <Calendar size={12} color={colors.muted} strokeWidth={1.75} />
              <Text style={[s.mutedXs, { marginLeft: 4, flex: 1 }]}>DEADLINE</Text>
            </View>
            <Text style={s.cardTitle}>{formatDeadline(task.deadline)}</Text>
          </View>
        </View>

        {/* Description */}
        <Accordion title="Mô tả">
          <Text style={[s.mutedXs, { lineHeight: 20 }]}>
            {task.description || 'Chưa có mô tả cho task này.'}
          </Text>
        </Accordion>

        {/* AI Insights */}
        <Accordion accent title={
          <View style={s.rowStart}>
            <Sparkles size={16} color={colors.purpleLight} />
            <Text style={[s.cardTitle, { marginLeft: 8 }]}>AI Insights</Text>
          </View>
        }>
          {riskQuery.isLoading ? (
            <ActivityIndicator color={colors.purpleLight} />
          ) : (
            <>
              <View style={[s.rowStart, { marginBottom: 12 }]}>
                <Clock size={16} color="#60A5FA" strokeWidth={1.75} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={s.cardTitle}>Ước lượng thời gian</Text>
                  <Text style={s.mutedXs}>
                    {task.aiEstimatedTime != null
                      ? `AI: ${task.aiEstimatedTime}h · Thực tế: ${task.actualTime ?? 0}h`
                      : 'AI chưa ước lượng cho task này'}
                  </Text>
                </View>
              </View>

              <View style={[s.rowStart, { marginBottom: 12 }]}>
                <AlertTriangle size={16} color={colors.yellow} strokeWidth={1.75} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={s.cardTitle}>Yếu tố rủi ro</Text>
                  {latestRisk && latestRisk.factors.length > 0 ? (
                    latestRisk.factors
                      .slice()
                      .sort((a, b) => b.contribution - a.contribution)
                      .slice(0, 3)
                      .map(factor => (
                        <Text key={factor.code} style={s.mutedXs}>
                          {factor.code}: {factor.rawValue} (+{factor.contribution.toFixed(1)})
                        </Text>
                      ))
                  ) : (
                    <Text style={s.mutedXs}>Chưa có dữ liệu phân tích</Text>
                  )}
                </View>
              </View>

              <View style={s.rowStart}>
                <TrendingUp size={16} color={colors.green} strokeWidth={1.75} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={s.cardTitle}>Khuyến nghị</Text>
                  {latestRisk && latestRisk.mitigationActions.length > 0 ? (
                    latestRisk.mitigationActions.map((action, i) => (
                      <Text key={i} style={s.mutedXs}>• {action}</Text>
                    ))
                  ) : (
                    <Text style={s.mutedXs}>{task.aiSummary || 'Chưa có khuyến nghị'}</Text>
                  )}
                </View>
              </View>

              <TouchableOpacity style={s.analyzeBtn} onPress={runAnalysis} disabled={isAnalyzing}>
                {isAnalyzing
                  ? <ActivityIndicator size="small" color={colors.purpleLight} />
                  : <Text style={s.analyzeText}>Chạy phân tích rủi ro</Text>}
              </TouchableOpacity>
            </>
          )}
        </Accordion>

        {/* Dependencies */}
        <Accordion
          title="Phụ thuộc"
          defaultOpen={task.dependencies.length > 0}
          badge={
            <View style={[s.badge, { backgroundColor: 'rgba(41,98,255,0.12)', marginLeft: 8 }]}>
              <Text style={[s.badgeText, { color: '#60A5FA' }]}>{doneDependencies}/{task.dependencies.length}</Text>
            </View>
          }
        >
          {task.dependencies.length === 0 ? (
            <Text style={s.mutedXs}>Task này không chờ task nào khác.</Text>
          ) : (
            task.dependencies.map((dep, i) => (
              <View
                key={dep.dependencyId}
                style={[s.rowStart, {
                  paddingVertical: 10,
                  borderBottomWidth: i < task.dependencies.length - 1 ? 1 : 0,
                  borderBottomColor: 'rgba(255,255,255,0.04)',
                  alignItems: 'center',
                }]}
              >
                <View style={[s.check, {
                  backgroundColor: dep.status === 'Done' ? colors.green : 'transparent',
                  borderColor: dep.status === 'Done' ? colors.green : 'rgba(93,126,166,0.5)',
                }]}>
                  {dep.status === 'Done' && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
                </View>
                <TouchableOpacity
                  style={{ flex: 1, marginLeft: 12 }}
                  onPress={() => navigation.push('TaskDetail', { taskId: dep.dependsOnTaskId })}
                >
                  <Text style={[s.mutedXs, {
                    color: dep.status === 'Done' ? colors.muted : colors.foreground,
                    textDecorationLine: dep.status === 'Done' ? 'line-through' : 'none',
                  }]}>
                    {dep.dependsOnTaskTitle ?? `Task #${dep.dependsOnTaskId}`}
                  </Text>
                </TouchableOpacity>
                <Link2 size={12} color={colors.muted} />
              </View>
            ))
          )}
        </Accordion>

        {/* Comments */}
        <Accordion
          title={
            <View style={s.rowStart}>
              <MessageSquare size={16} color={colors.foreground} strokeWidth={1.75} />
              <Text style={[s.cardTitle, { marginLeft: 8 }]}>Bình luận</Text>
            </View>
          }
          badge={
            <View style={[s.badge, { backgroundColor: 'rgba(255,255,255,0.08)', marginLeft: 8 }]}>
              <Text style={[s.badgeText, { color: colors.muted }]}>{comments.length}</Text>
            </View>
          }
        >
          {commentsQuery.isLoading ? (
            <ActivityIndicator color={colors.blue} />
          ) : comments.length === 0 ? (
            <Text style={s.mutedXs}>Chưa có bình luận nào.</Text>
          ) : (
            comments.map(comment => (
              <View key={comment.commentId} style={s.commentRow}>
                <LinearGradient
                  colors={gradientFor(comment.userName)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.avatarSm}
                >
                  <Text style={s.avatarSmText}>{getInitials(comment.userName)}</Text>
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={s.row}>
                    <Text style={[s.cardTitle, { fontSize: 12 }]}>{comment.userName ?? 'Ẩn danh'}</Text>
                    <Text style={s.mutedXs}>{timeAgo(comment.createdAt)}</Text>
                  </View>
                  <Text style={[s.mutedXs, { marginTop: 2, lineHeight: 18 }]}>{comment.content}</Text>
                </View>
              </View>
            ))
          )}

          <View style={s.commentInputRow}>
            <TextInput
              style={s.commentInput}
              placeholder="Viết bình luận…"
              placeholderTextColor={colors.muted}
              value={draftComment}
              onChangeText={setDraftComment}
              multiline
              editable={!isPostingComment}
            />
            <TouchableOpacity
              style={[s.sendBtn, { opacity: draftComment.trim() && !isPostingComment ? 1 : 0.4 }]}
              onPress={postComment}
              disabled={!draftComment.trim() || isPostingComment}
            >
              {isPostingComment
                ? <ActivityIndicator size="small" color="#fff" />
                : <Send size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        </Accordion>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  centered:     { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', paddingHorizontal: 20, gap: 12, alignItems: 'center' },
  stickyHeader: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: 'rgba(3,12,26,0.95)' },
  content:      { paddingHorizontal: 20, paddingTop: 12 },
  card:         { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accordionBody:   { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  mainTitle:    { fontSize: 22, fontWeight: '700', color: colors.foreground, lineHeight: 28 },
  cardTitle:    { fontSize: 14, fontWeight: '600', color: colors.foreground },
  bigNum:       { fontSize: 22, fontWeight: '600', color: colors.foreground },
  mutedXs:      { fontSize: 11, color: colors.muted },
  badge:        { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText:    { fontSize: 10, fontWeight: '600' },
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowStart:     { flexDirection: 'row', alignItems: 'flex-start' },
  grid2:        { flexDirection: 'row', marginBottom: 12 },
  iconBtn:      { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  iconBox:      { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarSm:     { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarSmText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  statusRow:    { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statusBtn:    { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  statusText:   { fontSize: 12, fontWeight: '600' },
  analyzeBtn:   { marginTop: 16, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(124,77,255,0.15)', borderWidth: 1, borderColor: 'rgba(124,77,255,0.3)' },
  analyzeText:  { fontSize: 12, fontWeight: '600', color: colors.purpleLight },
  check:        { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  commentRow:   { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 12 },
  commentInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.foreground, maxHeight: 100 },
  sendBtn:      { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  barTrack:     { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 4 },
});
