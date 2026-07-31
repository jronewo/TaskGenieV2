import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, StyleSheet, TextInput, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search, Mail, CheckCircle2, Clock, AlertTriangle, Sparkles, Award,
} from 'lucide-react-native';
import { colors, AVATAR_GRADIENTS } from '../theme';
import InviteMemberSheet from '../components/InviteMemberSheet';

interface MemberStats {
  active: number;
  completed: number;
  atRisk: number;
}

function statsByUser(tasks: TaskDetail[]): Map<number, MemberStats> {
  const map = new Map<number, MemberStats>();
  for (const task of tasks) {
    for (const assignee of task.assignees) {
      const current = map.get(assignee.userId) ?? { active: 0, completed: 0, atRisk: 0 };
      if (task.status === 'Done') current.completed += 1;
      else current.active += 1;
      if ((task.riskLevel ?? '').toUpperCase() === 'HIGH' && task.status !== 'Done') {
        current.atRisk += 1;
      }
      map.set(assignee.userId, current);
    }
  }
  return map;
}

function AnimatedBar({ target, delay }: { target: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: target, duration: 800, delay, useNativeDriver: false }).start();
  }, [target]);
  return (
    <View style={s.barTrack}>
      <Animated.View style={[s.barFill, { width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
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

export default function TeamScreen() {
  const { activeProject, activeProjectId } = useProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  const teamId = activeProject?.teamId ?? null;

  const teamQuery = useApiQuery<Team>(
    signal => teamsApi.getById(teamId!, signal),
    [teamId],
    { enabled: teamId !== null },
  );

  const tasksQuery = useApiQuery<TaskDetail[]>(
    signal => tasksApi.getByProject(activeProjectId!, signal),
    [activeProjectId],
    { enabled: activeProjectId !== null },
  );
  useRefetchOnFocus(tasksQuery.refetch, activeProjectId !== null);

  // Reward/penalty points are the only performance signal the API exposes.
  const leaderboardQuery = useApiQuery(
    signal => scoresApi.getProjectLeaderboard(activeProjectId!, signal),
    [activeProjectId],
    { enabled: activeProjectId !== null },
  );

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const taskStats = useMemo(() => statsByUser(tasks), [tasks]);

  const scoreByUser = useMemo(() => {
    const map = new Map<number, { level: string; totalScore: number; progress: number }>();
    for (const member of leaderboardQuery.data?.members ?? []) {
      map.set(member.userId, {
        level: member.level,
        totalScore: member.totalScore,
        progress: member.progressToNextLevel,
      });
    }
    return map;
  }, [leaderboardQuery.data]);

  const members = useMemo(() => teamQuery.data?.members ?? [], [teamQuery.data]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      m =>
        (m.userName ?? '').toLowerCase().includes(q) ||
        (m.role ?? '').toLowerCase().includes(q) ||
        (m.userEmail ?? '').toLowerCase().includes(q),
    );
  }, [members, searchQuery]);

  const totals = useMemo(() => {
    let active = 0;
    let completed = 0;
    for (const stat of taskStats.values()) {
      active += stat.active;
      completed += stat.completed;
    }
    return { active, completed };
  }, [taskStats]);

  const isLoading = teamQuery.isLoading || tasksQuery.isLoading;
  const error = teamQuery.error ?? tasksQuery.error;

  const refetchAll = () => {
    teamQuery.refetch();
    tasksQuery.refetch();
    leaderboardQuery.refetch();
  };

  const renderBody = () => {
    if (activeProjectId === null) return <EmptyState message="Bạn chưa thuộc dự án nào." />;
    if (teamId === null) return <EmptyState message="Dự án này chưa gắn với team nào." />;
    if (isLoading) return <LoadingState label="Đang tải thành viên…" />;
    if (error) return <ErrorState error={error} onRetry={refetchAll} />;
    if (filtered.length === 0) {
      return (
        <EmptyState
          message={searchQuery ? 'Không tìm thấy thành viên phù hợp.' : 'Team này chưa có thành viên.'}
        />
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
        <RefreshControl
          refreshing={tasksQuery.isRefreshing || teamQuery.isRefreshing}
          onRefresh={refetchAll}
          tintColor={colors.blue}
        />
      }
    >
      {/* Header */}
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <ProjectPicker />
          <Text style={s.title}>{teamQuery.data?.name ?? 'Team'}</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setInviteOpen(true)}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchBox}>
        <Search size={16} color={colors.muted} strokeWidth={1.75} />
        <TextInput
          style={s.searchInput}
          placeholder="Tìm theo tên, vai trò hoặc email…"
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Performance overview */}
      <View style={[s.card, { borderColor: 'rgba(124,77,255,0.25)', backgroundColor: 'rgba(124,77,255,0.08)', marginTop: 12 }]}>
        <View style={s.row}>
          <Sparkles size={16} color={colors.purpleLight} />
          <Text style={[s.mutedXs, { color: colors.purpleLight, marginLeft: 8 }]}>
            HIỆU SUẤT TEAM · {activeProject?.name ?? ''}
          </Text>
        </View>
        <View style={s.statsRow}>
          {[
            { value: String(totals.active), label: 'Đang làm', color: colors.foreground },
            { value: String(totals.completed), label: 'Hoàn thành', color: colors.green },
            { value: `${activeProject?.progress ?? 0}%`, label: 'Tiến độ dự án', color: colors.foreground },
          ].map(stat => (
            <View key={stat.label} style={s.statBox}>
              <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.mutedXs}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Members count */}
      <Text style={[s.mutedXs, { textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 16, marginBottom: 12 }]}>
        {filtered.length} thành viên
      </Text>

      {renderBody()}

      {/* Member cards */}
      {filtered.map((member, i) => {
        const stats = taskStats.get(member.userId) ?? { active: 0, completed: 0, atRisk: 0 };
        const score = scoreByUser.get(member.userId);
        const isLeader = (member.role ?? '').toUpperCase() === 'LEADER';
        return (
          <FadeSlide key={member.id} delay={i * 60}>
            <View style={s.card}>
              {/* Avatar + info */}
              <View style={[s.row, { alignItems: 'flex-start', marginBottom: 16 }]}>
                <View style={{ marginRight: 12 }}>
                  <LinearGradient colors={gradientFor(member.userName)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatar}>
                    <Text style={s.avatarText}>{getInitials(member.userName)}</Text>
                  </LinearGradient>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.memberName}>{member.userName ?? 'Không rõ'}</Text>
                  <Text style={[s.mutedXs, { marginBottom: 6 }]}>{member.userEmail}</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <View style={[s.statusBadge, { backgroundColor: isLeader ? 'rgba(245,158,11,0.12)' : 'rgba(93,126,166,0.12)' }]}>
                      <Text style={[s.statusText, { color: isLeader ? colors.yellow : colors.muted }]}>
                        {member.role ?? 'MEMBER'}
                      </Text>
                    </View>
                    {score && (
                      <View style={[s.statusBadge, { backgroundColor: 'rgba(16,185,129,0.12)', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <Award size={10} color={colors.green} />
                        <Text style={[s.statusText, { color: colors.green }]}>{score.level}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Stats */}
              <View style={s.statsRow}>
                {[
                  { value: stats.active,    label: 'Đang làm', icon: Clock,         color: colors.foreground },
                  { value: stats.completed, label: 'Xong',     icon: CheckCircle2,  color: colors.green },
                  { value: stats.atRisk,    label: 'Rủi ro',   icon: AlertTriangle, color: stats.atRisk > 0 ? colors.red : colors.muted },
                ].map(stat => {
                  const Icon = stat.icon;
                  return (
                    <View key={stat.label} style={s.statBox}>
                      <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Icon size={10} color={colors.muted} strokeWidth={1.75} />
                        <Text style={s.mutedXs}>{stat.label}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Level progress */}
              {score && (
                <View style={{ marginVertical: 12 }}>
                  <View style={s.row}>
                    <Text style={s.mutedXs}>Điểm tích luỹ</Text>
                    <Text style={[s.mutedXs, { color: colors.foreground, fontWeight: '600' }]}>
                      {score.totalScore} điểm
                    </Text>
                  </View>
                  <AnimatedBar target={Math.min(100, Math.max(0, score.progress))} delay={i * 60 + 200} />
                </View>
              )}

              {/* Actions */}
              <View style={s.actionsRow}>
                {[
                  { icon: MessageCircle, label: 'Message', onPress: () => Alert.alert('Message', `Nhắn tin cho ${member.name} (sắp ra mắt).`) },
                  { icon: Mail,          label: 'Email',   onPress: () => Alert.alert('Email', `Gửi email tới ${member.email}`) },
                ].map(action => {
                  const Icon = action.icon;
                  return (
                    <TouchableOpacity key={action.label} style={s.actionBtn} onPress={action.onPress}>
                      <Icon size={14} color={colors.foreground} strokeWidth={1.75} />
                      <Text style={[s.mutedXs, { color: colors.foreground, marginLeft: 6 }]}>{action.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </FadeSlide>
        );
      })}
      <View style={{ height: 20 }} />

      {inviteOpen && (
        <InviteMemberSheet
          onClose={() => setInviteOpen(false)}
          onInvite={email => Alert.alert('Đã gửi lời mời', `Lời mời đã được gửi tới ${email}.`)}
        />
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:      { flex: 1, backgroundColor: colors.bg },
  content:     { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title:       { fontSize: 26, fontWeight: '700', color: colors.foreground },
  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(17,30,53,0.8)', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: colors.foreground },
  card:        { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  statsRow:    { flexDirection: 'row', gap: 8, marginTop: 8 },
  statBox:     { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, alignItems: 'center' },
  statValue:   { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar:      { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: '#fff', fontSize: 14, fontWeight: '700' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statusText:  { fontSize: 10, fontWeight: '500' },
  memberName:  { fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 2 },
  barTrack:    { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  barFill:     { height: '100%', borderRadius: 4, backgroundColor: colors.blue },
  actionsRow:  { flexDirection: 'row', gap: 8 },
  actionBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border },
  mutedXs:     { fontSize: 11, color: colors.muted },
});
