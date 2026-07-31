import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, StyleSheet, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCircle2, Clock, AlertCircle, TrendingUp, ChevronRight, Sparkles,
} from 'lucide-react-native';
import { colors } from '../theme';
import { tasksApi, type TaskDetail } from '../api';
import { useApiQuery, useRefetchOnFocus } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectContext';
import { LoadingState, ErrorState, EmptyState } from '../components/StateViews';
import { gradientFor, getInitials } from '../utils/avatar';
import {
  priorityStyle, statusLabel, riskPercent, formatDeadline, primaryAssignee, daysUntilDeadline,
} from '../utils/task';

function AnimatedBar({ progress, color, delay }: { progress: number; color: string; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: progress, duration: 900, delay, useNativeDriver: false }).start();
  }, [progress]);
  return (
    <View style={s.barTrack}>
      <Animated.View
        style={[s.barFill, { backgroundColor: color, width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]}
      />
    </View>
  );
}

function FadeSlide({ children, delay }: { children: React.ReactNode; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,     { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(translateY,  { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

/** Derives the four headline numbers from the user's task list. */
function buildStats(tasks: TaskDetail[]) {
  const done = tasks.filter(t => t.status === 'Done').length;
  const inProgress = tasks.filter(t => t.status === 'InProgress').length;
  const active = tasks.filter(t => t.status !== 'Done').length;
  const atRisk = tasks.filter(t => (t.riskLevel ?? '').toUpperCase() === 'HIGH').length;
  const completion = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return {
    done,
    active,
    cards: [
      { label: 'Active Tasks', value: String(active),      hint: `${tasks.length} total`,     good: true,          icon: CheckCircle2 },
      { label: 'In Progress',  value: String(inProgress),  hint: `${done} done`,              good: true,          icon: Clock },
      { label: 'At Risk',      value: String(atRisk),      hint: atRisk ? 'needs attention' : 'all clear', good: atRisk === 0, icon: AlertCircle },
      { label: 'Completion',   value: `${completion}%`,    hint: `${done}/${tasks.length}`,   good: completion >= 50, icon: TrendingUp },
    ],
  };
}

/** A short, honest summary — no forecast the backend cannot back up. */
function buildInsight(tasks: TaskDetail[]) {
  const highRisk = tasks.filter(t => (t.riskLevel ?? '').toUpperCase() === 'HIGH');
  if (highRisk.length > 0) {
    return {
      headline: `${highRisk.length} task đang ở mức rủi ro cao`,
      detail: highRisk.map(t => t.title).filter(Boolean).slice(0, 2).join(' · ') || 'Xem chi tiết trên bảng công việc',
    };
  }

  const overdue = tasks.filter(t => t.status !== 'Done' && (daysUntilDeadline(t.deadline) ?? 1) < 0);
  if (overdue.length > 0) {
    return {
      headline: `${overdue.length} task đã quá hạn`,
      detail: 'Cập nhật tiến độ hoặc dời deadline để AI đánh giá lại rủi ro',
    };
  }

  const dueSoon = tasks.filter(t => {
    const days = daysUntilDeadline(t.deadline);
    return t.status !== 'Done' && days !== null && days >= 0 && days <= 3;
  });
  if (dueSoon.length > 0) {
    return {
      headline: `${dueSoon.length} task đến hạn trong 3 ngày tới`,
      detail: dueSoon.map(t => t.title).filter(Boolean).slice(0, 2).join(' · '),
    };
  }

  return { headline: 'Không có rủi ro nào được ghi nhận', detail: 'Toàn bộ task của bạn đang đúng tiến độ' };
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const { activeProject, isLoading: isLoadingProjects } = useProjects();

  const { data, error, isLoading, isRefreshing, refetch } = useApiQuery(
    signal => tasksApi.getMine(signal),
    [],
  );
  useRefetchOnFocus(refetch);

  const tasks = useMemo(() => data ?? [], [data]);
  const stats = useMemo(() => buildStats(tasks), [tasks]);
  const insight = useMemo(() => buildInsight(tasks), [tasks]);

  const recentTasks = useMemo(
    () =>
      [...tasks]
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
        .slice(0, 5),
    [tasks],
  );

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const firstName = (session?.name ?? '').trim().split(/\s+/).pop() || 'bạn';

  const renderBody = useCallback(() => {
    if (isLoading) return <LoadingState label="Đang tải công việc của bạn…" />;
    if (error) return <ErrorState error={error} onRetry={refetch} />;
    if (tasks.length === 0) return <EmptyState message="Bạn chưa được giao task nào." />;
    return null;
  }, [isLoading, error, tasks.length, refetch]);

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
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.subtitle}>
            {today}{activeProject ? ` — ${activeProject.name}` : ''}
          </Text>
          <Text style={s.title}>
            Xin chào, <Text style={{ color: colors.blue }}>{firstName}</Text>
          </Text>
        </View>
        <LinearGradient colors={gradientFor(session?.name)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatar}>
          <Text style={s.avatarText}>{getInitials(session?.name)}</Text>
        </LinearGradient>
      </View>

      {/* Project progress */}
      {activeProject && (
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.cardLabel}>{activeProject.name}</Text>
            <Text style={s.mutedSm}>{activeProject.status ?? 'Active'}</Text>
          </View>
          <View style={s.barTrack}>
            <LinearGradient
              colors={[colors.blue, colors.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.barFill, { width: `${Math.min(100, Math.max(0, activeProject.progress))}%` }]}
            />
          </View>
          <View style={s.row}>
            <Text style={s.mutedXs}>{activeProject.progress}% hoàn thành</Text>
            <Text style={s.mutedXs}>Hạn {formatDeadline(activeProject.deadline)}</Text>
          </View>
        </View>
      )}
      {!activeProject && !isLoadingProjects && (
        <View style={s.card}>
          <Text style={s.mutedXs}>Bạn chưa thuộc dự án nào.</Text>
        </View>
      )}

      {/* Stats grid */}
      {!isLoading && !error && (
        <View style={s.grid2}>
          {stats.cards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <FadeSlide key={stat.label} delay={i * 70}>
                <View style={[s.card, s.statCard]}>
                  <View style={s.row}>
                    <Icon size={16} color={colors.muted} strokeWidth={1.75} />
                    <View style={[s.badge, { backgroundColor: stat.good ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                      <Text style={[s.badgeText, { color: stat.good ? colors.green : colors.red }]}>{stat.hint}</Text>
                    </View>
                  </View>
                  <Text style={s.statValue}>{stat.value}</Text>
                  <Text style={s.mutedXs}>{stat.label}</Text>
                </View>
              </FadeSlide>
            );
          })}
        </View>
      )}

      {/* AI Insight */}
      {!isLoading && !error && tasks.length > 0 && (
        <View style={[s.card, { borderColor: 'rgba(124,77,255,0.25)', backgroundColor: 'rgba(124,77,255,0.08)' }]}>
          <View style={s.rowStart}>
            <View style={[s.iconBox, { backgroundColor: 'rgba(124,77,255,0.2)' }]}>
              <Sparkles size={16} color={colors.purpleLight} strokeWidth={1.75} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.mutedXs, { color: colors.purpleLight, marginBottom: 4 }]}>AI INSIGHT</Text>
              <Text style={s.cardLabel}>{insight.headline}</Text>
              {!!insight.detail && <Text style={[s.mutedXs, { marginTop: 2 }]}>{insight.detail}</Text>}
            </View>
          </View>
        </View>
      )}

      {/* Recent Tasks */}
      <View style={s.row}>
        <Text style={s.sectionTitle}>Task gần đây</Text>
        <TouchableOpacity style={s.row} onPress={() => navigation.navigate('Board')}>
          <Text style={[s.mutedXs, { color: colors.blue }]}>Xem tất cả </Text>
          <ChevronRight size={14} color={colors.blue} />
        </TouchableOpacity>
      </View>

      {renderBody()}

      {recentTasks.map((task, i) => {
        const pCfg = priorityStyle(task.priority);
        const assignee = primaryAssignee(task);
        const risk = riskPercent(task.riskLevel);
        const progress = task.progress ?? 0;
        return (
          <FadeSlide key={task.taskId} delay={280 + i * 80}>
            <TouchableOpacity
              style={s.taskCard}
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.taskId })}
              activeOpacity={0.8}
            >
              <View style={[s.taskStripe, { backgroundColor: pCfg.stripe }]} />
              <View style={{ flex: 1, padding: 16 }}>
                <View style={[s.row, { marginBottom: 8 }]}>
                  <Text style={[s.cardLabel, { flex: 1 }]} numberOfLines={2}>{task.title}</Text>
                  <View style={[s.badge, { backgroundColor: pCfg.badgeBg }]}>
                    <Text style={[s.badgeText, { color: pCfg.badgeColor }]}>{task.priority ?? 'Medium'}</Text>
                  </View>
                </View>
                <View style={[s.row, { marginBottom: 12 }]}>
                  <View style={[s.pill, { backgroundColor: 'rgba(41,98,255,0.12)' }]}>
                    <Text style={[s.badgeText, { color: '#60A5FA' }]}>{statusLabel(task.status)}</Text>
                  </View>
                  {assignee && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <LinearGradient colors={gradientFor(assignee.userName)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatarXs}>
                        <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{getInitials(assignee.userName)}</Text>
                      </LinearGradient>
                      <Text style={[s.mutedXs, { marginLeft: 4 }]}>{assignee.userName}</Text>
                    </View>
                  )}
                </View>
                <View style={s.row}>
                  <Text style={s.mutedXs}>Tiến độ</Text>
                  <Text style={[s.mutedXs, { color: colors.foreground }]}>{progress}%</Text>
                </View>
                <AnimatedBar progress={progress} color={pCfg.stripe} delay={400 + i * 100} />
                <View style={[s.row, { marginTop: 10 }]}>
                  <Text style={s.mutedXs}>Hạn {formatDeadline(task.deadline)}</Text>
                  {risk >= 55 && <Text style={[s.mutedXs, { color: colors.red }]}>Rủi ro {task.riskLevel}</Text>}
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
  scroll:       { flex: 1, backgroundColor: colors.bg },
  content:      { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  subtitle:     { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  title:        { fontSize: 26, fontWeight: '700', color: colors.foreground },
  avatar:       { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { color: '#fff', fontSize: 14, fontWeight: '600' },
  avatarXs:     { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  card:         { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  taskCard:     { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, marginBottom: 12, flexDirection: 'row', overflow: 'hidden' },
  taskStripe:   { width: 3 },
  statCard:     { flex: 1, margin: 4 },
  grid2:        { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 4 },
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  rowStart:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox:      { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badge:        { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  pill:         { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText:    { fontSize: 10, fontWeight: '600' },
  cardLabel:    { fontSize: 13, fontWeight: '600', color: colors.foreground, lineHeight: 18 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 12 },
  statValue:    { fontSize: 28, fontWeight: '600', color: colors.foreground, marginVertical: 4 },
  mutedSm:      { fontSize: 12, color: colors.muted },
  mutedXs:      { fontSize: 11, color: colors.muted },
  barTrack:     { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginVertical: 6 },
  barFill:      { height: '100%', borderRadius: 4 },
});
