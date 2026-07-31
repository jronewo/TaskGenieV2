import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, StyleSheet, Dimensions, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react-native';
import { colors } from '../theme';
import { scoresApi, tasksApi, type TaskDetail } from '../api';
import { useApiQuery, useRefetchOnFocus } from '../hooks/useApi';
import { useProjects } from '../contexts/ProjectContext';
import { LoadingState, ErrorState, EmptyState } from '../components/StateViews';
import ProjectPicker from '../components/ProjectPicker';
import { gradientFor, getInitials } from '../utils/avatar';
import { formatDeadline } from '../utils/task';

const { width } = Dimensions.get('window');
const CHART_W = width - 40;
const CHART_H = 140;

const WINDOWS = [
  { id: '7', label: '7 ngày', days: 7 },
  { id: '30', label: '30 ngày', days: 30 },
  { id: '90', label: '90 ngày', days: 90 },
] as const;

interface Bucket {
  label: string;
  completed: number;
}

/** Groups completions into evenly sized buckets across the selected window. */
function completionBuckets(tasks: TaskDetail[], days: number): Bucket[] {
  const bucketCount = 7;
  const bucketDays = Math.max(1, Math.round(days / bucketCount));
  const now = Date.now();

  const buckets: Bucket[] = Array.from({ length: bucketCount }, (_, i) => {
    const end = new Date(now - (bucketCount - 1 - i) * bucketDays * 86400000);
    return {
      label:
        bucketDays === 1
          ? end.toLocaleDateString('en-US', { weekday: 'short' })
          : end.toLocaleDateString('en-US', { day: 'numeric', month: 'numeric' }),
      completed: 0,
    };
  });

  const windowStart = now - days * 86400000;
  for (const task of tasks) {
    if (!task.completedAt) continue;
    const at = new Date(task.completedAt).getTime();
    if (Number.isNaN(at) || at < windowStart || at > now) continue;
    const index = Math.min(
      bucketCount - 1,
      Math.floor((at - windowStart) / (bucketDays * 86400000)),
    );
    buckets[index].completed += 1;
  }

  return buckets;
}

function CompletionChart({ buckets }: { buckets: Bucket[] }) {
  const max = Math.max(1, ...buckets.map(b => b.completed));
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H, gap: 8 }}>
        {buckets.map((bucket, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <Text style={[a.mutedXs, { marginBottom: 4 }]}>{bucket.completed || ''}</Text>
            <LinearGradient
              colors={[colors.blue, colors.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                width: '100%',
                height: Math.max(3, (bucket.completed / max) * (CHART_H - 24)),
                borderRadius: 6,
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
        {buckets.map((bucket, i) => (
          <Text key={i} style={[a.mutedXs, { flex: 1, textAlign: 'center' }]}>{bucket.label}</Text>
        ))}
      </View>
    </View>
  );
}

function RiskDistribution({ tasks }: { tasks: TaskDetail[] }) {
  const bands = useMemo(() => {
    const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, NONE: 0 };
    for (const task of tasks) {
      const band = (task.riskLevel ?? '').toUpperCase();
      if (band === 'LOW' || band === 'MEDIUM' || band === 'HIGH') counts[band] += 1;
      else counts.NONE += 1;
    }
    return [
      { label: 'Low', value: counts.LOW, color: colors.green },
      { label: 'Medium', value: counts.MEDIUM, color: colors.yellow },
      { label: 'High', value: counts.HIGH, color: colors.red },
      { label: 'Chưa đánh giá', value: counts.NONE, color: colors.muted },
    ];
  }, [tasks]);

  const max = Math.max(1, ...bands.map(b => b.value));

  return (
    <View style={{ gap: 12 }}>
      {bands.map(band => (
        <View key={band.label}>
          <View style={a.row}>
            <Text style={a.mutedXs}>{band.label}</Text>
            <Text style={[a.mutedXs, { color: colors.foreground }]}>{band.value}</Text>
          </View>
          <View style={a.barTrack}>
            <View style={[a.barFill, { backgroundColor: band.color, width: `${(band.value / max) * 100}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function AnimatedBar({ target, color, delay }: { target: number; color: string; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: target, duration: 800, delay, useNativeDriver: false }).start();
  }, [target]);
  return (
    <View style={a.barTrack}>
      <Animated.View style={[a.barFill, { backgroundColor: color, width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

function FadeSlide({ children, delay }: { children: React.ReactNode; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 350, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export default function AnalyticsScreen() {
  const { activeProject, activeProjectId } = useProjects();
  const [windowId, setWindowId] = useState<string>('30');

  const tasksQuery = useApiQuery<TaskDetail[]>(
    signal => tasksApi.getByProject(activeProjectId!, signal),
    [activeProjectId],
    { enabled: activeProjectId !== null },
  );
  useRefetchOnFocus(tasksQuery.refetch, activeProjectId !== null);

  const leaderboardQuery = useApiQuery(
    signal => scoresApi.getProjectLeaderboard(activeProjectId!, signal),
    [activeProjectId],
    { enabled: activeProjectId !== null },
  );

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const selectedWindow = WINDOWS.find(w => w.id === windowId) ?? WINDOWS[1];

  const metrics = useMemo(() => {
    const done = tasks.filter(t => t.status === 'Done');
    const highRisk = tasks.filter(t => (t.riskLevel ?? '').toUpperCase() === 'HIGH');
    const late = done.filter(t => t.isLate);
    const completion = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;
    const onTimeRate = done.length
      ? Math.round(((done.length - late.length) / done.length) * 100)
      : 0;

    const withTime = done.filter(t => (t.actualTime ?? 0) > 0);
    const avgTime = withTime.length
      ? withTime.reduce((sum, t) => sum + (t.actualTime ?? 0), 0) / withTime.length
      : 0;

    return [
      { label: 'Hoàn thành', value: String(completion), unit: '%', hint: `${done.length}/${tasks.length}`, up: completion >= 50 },
      { label: 'Đã xong',    value: String(done.length), unit: '', hint: `${tasks.length} tổng`, up: true },
      { label: 'Rủi ro cao', value: String(highRisk.length), unit: '', hint: highRisk.length ? 'cần xử lý' : 'ổn định', up: highRisk.length === 0 },
      { label: 'Đúng hạn',   value: String(onTimeRate), unit: '%', hint: avgTime ? `~${avgTime.toFixed(1)}h/task` : 'chưa có giờ', up: onTimeRate >= 70 },
    ];
  }, [tasks]);

  const buckets = useMemo(
    () => completionBuckets(tasks, selectedWindow.days),
    [tasks, selectedWindow.days],
  );

  const performers = useMemo(() => {
    const completedByUser = new Map<number, number>();
    for (const task of tasks) {
      if (task.status !== 'Done') continue;
      for (const assignee of task.assignees) {
        completedByUser.set(assignee.userId, (completedByUser.get(assignee.userId) ?? 0) + 1);
      }
    }

    const members = leaderboardQuery.data?.members ?? [];
    if (members.length === 0) return [];

    const maxScore = Math.max(1, ...members.map(m => Math.abs(m.totalScore)));
    return [...members]
      .sort((x, y) => y.totalScore - x.totalScore)
      .slice(0, 5)
      .map(m => ({
        userId: m.userId,
        name: m.userName ?? 'Không rõ',
        level: m.level,
        completed: completedByUser.get(m.userId) ?? 0,
        totalScore: m.totalScore,
        barTarget: Math.max(0, Math.round((m.totalScore / maxScore) * 100)),
      }));
  }, [tasks, leaderboardQuery.data]);

  const refetchAll = () => {
    tasksQuery.refetch();
    leaderboardQuery.refetch();
  };

  const renderBody = () => {
    if (activeProjectId === null) return <EmptyState message="Bạn chưa thuộc dự án nào." />;
    if (tasksQuery.isLoading) return <LoadingState label="Đang tổng hợp số liệu…" />;
    if (tasksQuery.error) return <ErrorState error={tasksQuery.error} onRetry={refetchAll} />;
    if (tasks.length === 0) return <EmptyState message="Dự án chưa có task nào để phân tích." />;
    return null;
  };

  const body = renderBody();

  return (
    <ScrollView
      style={a.scroll}
      contentContainerStyle={a.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={tasksQuery.isRefreshing} onRefresh={refetchAll} tintColor={colors.blue} />
      }
    >
      <ProjectPicker />
      <Text style={a.title}>Phân tích</Text>

      {/* Window selector */}
      <View style={a.segmented}>
        {WINDOWS.map(w => (
          <TouchableOpacity
            key={w.id}
            onPress={() => setWindowId(w.id)}
            style={[a.segmentBtn, { backgroundColor: windowId === w.id ? colors.blue : 'transparent' }]}
          >
            <Text style={[a.segmentText, { color: windowId === w.id ? '#fff' : colors.muted }]}>
              {w.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {body}

      {!body && (
        <>
          {/* Metric cards */}
          <View style={a.grid2}>
            {metrics.map((m, i) => (
              <FadeSlide key={m.label} delay={i * 60}>
                <View style={[a.card, a.metricCard]}>
                  <View style={[a.row, { marginBottom: 12 }]}>
                    <Text style={a.mutedXs}>{m.label}</Text>
                    <View style={a.row}>
                      {m.up
                        ? <TrendingUp size={12} color={colors.green} />
                        : <TrendingDown size={12} color={colors.red} />}
                    </View>
                  </View>
                  <View style={a.row}>
                    <Text style={a.bigNum}>{m.value}</Text>
                    {!!m.unit && <Text style={a.mutedXs}>{m.unit}</Text>}
                  </View>
                  <Text style={[a.mutedXs, { marginTop: 4 }]}>{m.hint}</Text>
                </View>
              </FadeSlide>
            ))}
          </View>

          {/* Completion chart */}
          <View style={a.card}>
            <Text style={a.cardTitle}>Task hoàn thành · {selectedWindow.label}</Text>
            <View style={{ marginTop: 16 }}>
              <CompletionChart buckets={buckets} />
            </View>
          </View>

          {/* Risk distribution */}
          <View style={a.card}>
            <Text style={[a.cardTitle, { marginBottom: 16 }]}>Phân bố rủi ro</Text>
            <RiskDistribution tasks={tasks} />
          </View>

          {/* Top performers */}
          <View style={a.card}>
            <Text style={[a.cardTitle, { marginBottom: 16 }]}>Xếp hạng điểm</Text>
            {leaderboardQuery.isLoading ? (
              <Text style={a.mutedXs}>Đang tải…</Text>
            ) : performers.length === 0 ? (
              <Text style={a.mutedXs}>Chưa có điểm thưởng/phạt nào được ghi nhận.</Text>
            ) : (
              performers.map((member, i) => (
                <View key={member.userId} style={{ marginBottom: i < performers.length - 1 ? 16 : 0 }}>
                  <View style={[a.row, { marginBottom: 6 }]}>
                    <View style={a.row}>
                      <LinearGradient colors={gradientFor(member.name)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={a.avatarSm}>
                        <Text style={a.avatarText}>{getInitials(member.name)}</Text>
                      </LinearGradient>
                      <View style={{ marginLeft: 10 }}>
                        <Text style={a.cardTitle}>{member.name}</Text>
                        <Text style={a.mutedXs}>{member.level}</Text>
                      </View>
                    </View>
                    <View style={a.row}>
                      <Text style={a.mutedXs}>{member.completed} task </Text>
                      <Text style={[a.cardTitle, { fontSize: 13 }]}>{member.totalScore}đ</Text>
                    </View>
                  </View>
                  <AnimatedBar target={member.barTarget} color={colors.blue} delay={i * 100 + 300} />
                </View>
              ))
            )}
          </View>

          {/* Project forecast */}
          {activeProject && (
            <View style={[a.card, { borderColor: 'rgba(124,77,255,0.25)', backgroundColor: 'rgba(124,77,255,0.08)' }]}>
              <View style={a.row}>
                <View style={[a.iconBox, { backgroundColor: 'rgba(124,77,255,0.2)' }]}>
                  <Sparkles size={16} color={colors.purpleLight} strokeWidth={1.75} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[a.mutedXs, { color: colors.purpleLight, marginBottom: 4 }]}>DỰ BÁO DỰ ÁN</Text>
                  <Text style={a.cardTitle}>
                    {activeProject.predictedEndDate
                      ? `Dự kiến kết thúc ${formatDeadline(activeProject.predictedEndDate)}`
                      : 'Chưa có dự báo ngày kết thúc'}
                  </Text>
                  <Text style={[a.mutedXs, { marginTop: 4 }]}>
                    Hạn chót {formatDeadline(activeProject.deadline)} · tiến độ {activeProject.progress}%
                  </Text>
                </View>
              </View>
            </View>
          )}
        </>
      )}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const a = StyleSheet.create({
  scroll:       { flex: 1, backgroundColor: colors.bg },
  content:      { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  title:        { fontSize: 26, fontWeight: '700', color: colors.foreground, marginBottom: 20 },
  segmented:    { flexDirection: 'row', backgroundColor: 'rgba(17,30,53,0.8)', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 4, marginBottom: 16 },
  segmentBtn:   { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentText:  { fontSize: 12, fontWeight: '600' },
  grid2:        { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 4 },
  card:         { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  metricCard:   { flex: 1, margin: 4, minWidth: CHART_W / 2 - 12 },
  cardTitle:    { fontSize: 14, fontWeight: '600', color: colors.foreground },
  bigNum:       { fontSize: 30, fontWeight: '600', color: colors.foreground },
  mutedXs:      { fontSize: 11, color: colors.muted },
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBox:      { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarSm:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { color: '#fff', fontSize: 10, fontWeight: '700' },
  barTrack:     { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  barFill:      { height: '100%', borderRadius: 4 },
});
