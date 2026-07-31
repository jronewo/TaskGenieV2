import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, MoreVertical, Calendar, AlertTriangle,
  MessageSquare, Paperclip, ChevronDown, ChevronUp,
  Clock, TrendingUp, Sparkles, Check,
} from 'lucide-react-native';
import { colors, AVATAR_GRADIENTS } from '../theme';
import { useTasks } from '../context/TasksContext';
import { useComments } from '../context/CommentsContext';
import { MOCK_USERS } from '../data/mockUsers';

const PRIORITY_CONFIG = {
  High:   { stripe: colors.red,    badgeBg: 'rgba(239,68,68,0.12)',   badgeColor: colors.red },
  Medium: { stripe: colors.yellow, badgeBg: 'rgba(245,158,11,0.12)',  badgeColor: colors.yellow },
  Low:    { stripe: colors.green,  badgeBg: 'rgba(16,185,129,0.12)',  badgeColor: colors.green },
} as const;

// Deterministic pseudo-score so the same task+user always shows the same numbers.
function seededPercent(seedA: number, seedB: number, min = 55, max = 97) {
  const x = Math.sin(seedA * 12.9898 + seedB * 78.233) * 43758.5453;
  const frac = x - Math.floor(x);
  return Math.round(min + frac * (max - min));
}

function buildRecommendations(taskId: string, currentAssigneeEmail: string) {
  const idSeed = Number(taskId) || 1;
  return MOCK_USERS
    .filter(u => u.email !== currentAssigneeEmail)
    .map(u => {
      const skillMatch  = seededPercent(idSeed, u.id * 3 + 1);
      const semantic    = seededPercent(idSeed, u.id * 3 + 2);
      const workload    = seededPercent(idSeed, u.id * 3 + 3);
      const performance = seededPercent(idSeed, u.id * 3 + 4);
      const score = skillMatch * 0.4 + semantic * 0.25 + workload * 0.2 + performance * 0.15;
      return { user: u, skillMatch, semantic, workload, performance, score: Math.round(score) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

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
  const id = route.params?.id ?? '1';
  const { getTask, updateAssignee } = useTasks();
  const { getComments } = useComments();

  const task = getTask(id) ?? getTask('1')!;
  const pCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.Medium;
  const completedSubtasks = task.subtasks.filter(st => st.done).length;
  const dueShort = new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const commentCount = getComments(task.id).length;
  const recommendations = buildRecommendations(task.id, task.assignee.email);

  const handleAccept = (candidate: typeof MOCK_USERS[number]) => {
    updateAssignee(task.id, { name: candidate.name, initials: candidate.initials, email: candidate.email });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Sticky header */}
      <View style={s.stickyHeader}>
        <View style={[s.row, { marginBottom: 16 }]}>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={16} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn}>
            <MoreVertical size={16} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={[s.row, { marginBottom: 8 }]}>
          <View style={[s.badge, { backgroundColor: pCfg.badgeBg }]}>
            <Text style={[s.badgeText, { color: pCfg.badgeColor }]}>{task.priority} Priority</Text>
          </View>
          <View style={[s.badge, { backgroundColor: 'rgba(41,98,255,0.12)' }]}>
            <Text style={[s.badgeText, { color: '#60A5FA' }]}>{task.status}</Text>
          </View>
        </View>
        <Text style={s.mainTitle}>{task.title}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Progress */}
        <View style={s.card}>
          <View style={[s.row, { marginBottom: 12 }]}>
            <Text style={s.mutedXs}>Overall Progress</Text>
            <Text style={s.bigNum}>{task.progress}%</Text>
          </View>
          <AnimatedBar progress={task.progress} color={pCfg.stripe} />
          <View style={[s.row, { marginTop: 8 }]}>
            <Text style={s.mutedXs}>{completedSubtasks}/{task.subtasks.length} subtasks done</Text>
            <Text style={s.mutedXs}>Due {dueShort}</Text>
          </View>
        </View>

        {/* Risk alert */}
        {task.risk > 50 && (
          <View style={[s.card, { backgroundColor: 'rgba(239,68,68,0.07)', borderColor: 'rgba(239,68,68,0.25)' }]}>
            <View style={s.rowStart}>
              <View style={[s.iconBox, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                <AlertTriangle size={16} color={colors.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, { marginBottom: 4 }]}>{task.risk}% delay probability</Text>
                <Text style={s.mutedXs}>AI flags 2 blocking dependencies and low velocity on auth layer</Text>
                <Text style={[s.mutedXs, { color: colors.red, marginTop: 6 }]}>View recommendations →</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick meta */}
        <View style={s.grid2}>
          <View style={[s.card, { flex: 1, marginRight: 6 }]}>
            <Text style={[s.mutedXs, { marginBottom: 8 }]}>ASSIGNEE</Text>
            <View style={s.rowStart}>
              <LinearGradient colors={AVATAR_GRADIENTS[task.assignee.initials] ?? [colors.blue, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatarSm}>
                <Text style={s.avatarSmText}>{task.assignee.initials}</Text>
              </LinearGradient>
              <Text style={[s.cardTitle, { fontSize: 13, marginLeft: 8 }]} numberOfLines={1}>{task.assignee.name}</Text>
            </View>
          </View>
          <View style={[s.card, { flex: 1, marginLeft: 6 }]}>
            <View style={[s.row, { marginBottom: 8 }]}>
              <Calendar size={12} color={colors.muted} strokeWidth={1.75} />
              <Text style={[s.mutedXs, { marginLeft: 4 }]}>DUE DATE</Text>
            </View>
            <Text style={s.cardTitle}>{dueShort}</Text>
          </View>
        </View>

        {/* Tags */}
        <View style={[s.wrap, { marginBottom: 12 }]}>
          {task.tags.map(tag => (
            <View key={tag} style={s.tagPill}>
              <Text style={s.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        {/* Description */}
        <Accordion title="Description">
          <Text style={[s.mutedXs, { lineHeight: 20 }]}>{task.description}</Text>
        </Accordion>

        {/* AI Insights */}
        <Accordion accent title={
          <View style={s.rowStart}>
            <Sparkles size={16} color={colors.purpleLight} />
            <Text style={[s.cardTitle, { marginLeft: 8 }]}>AI Insights</Text>
          </View>
        }>
          {[
            { icon: Clock,          iconColor: '#60A5FA', title: 'Estimated completion', desc: 'May 31 · 6 days behind schedule' },
            { icon: AlertTriangle,  iconColor: colors.yellow, title: 'Blockers detected', desc: '2 dependencies waiting on Platform team' },
            { icon: TrendingUp,     iconColor: colors.green,  title: 'Recommendation', desc: 'Add 1 engineer to authentication work stream' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <View key={i} style={[s.rowStart, { marginBottom: i < 2 ? 12 : 0 }]}>
                <Icon size={16} color={item.iconColor} strokeWidth={1.75} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  <Text style={s.mutedXs}>{item.desc}</Text>
                </View>
              </View>
            );
          })}
        </Accordion>

        {/* AI Assignment Suggestions */}
        <Accordion accent defaultOpen={false} title={
          <View style={s.rowStart}>
            <Sparkles size={16} color={colors.purpleLight} />
            <Text style={[s.cardTitle, { marginLeft: 8 }]}>Gợi ý người phụ trách (AI)</Text>
          </View>
        }>
          {recommendations.map((rec, i) => (
            <View key={rec.user.id} style={[s.recCard, { marginBottom: i < recommendations.length - 1 ? 10 : 0 }]}>
              <View style={[s.row, { marginBottom: 8 }]}>
                <View style={s.rowStart}>
                  <LinearGradient colors={AVATAR_GRADIENTS[rec.user.initials] ?? [colors.blue, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatarSm}>
                    <Text style={s.avatarSmText}>{rec.user.initials}</Text>
                  </LinearGradient>
                  <View style={{ marginLeft: 8 }}>
                    <Text style={s.cardTitle}>{rec.user.name}</Text>
                    <Text style={s.mutedXs}>{rec.user.role}</Text>
                  </View>
                </View>
                <View style={[s.badge, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                  <Text style={[s.badgeText, { color: colors.green }]}>{rec.score}% phù hợp</Text>
                </View>
              </View>
              <Text style={[s.mutedXs, { marginBottom: 10 }]}>
                Kỹ năng {rec.skillMatch}% · Tương đồng {rec.semantic}% · Khối lượng {rec.workload}% · Hiệu suất {rec.performance}%
              </Text>
              <TouchableOpacity style={s.acceptBtn} onPress={() => handleAccept(rec.user)} activeOpacity={0.85}>
                <Check size={14} color="#fff" />
                <Text style={s.acceptBtnText}>Gán công việc</Text>
              </TouchableOpacity>
            </View>
          ))}
        </Accordion>

        {/* Subtasks */}
        <Accordion
          title="Subtasks"
          badge={
            <View style={[s.badge, { backgroundColor: 'rgba(41,98,255,0.12)', marginLeft: 8 }]}>
              <Text style={[s.badgeText, { color: '#60A5FA' }]}>{completedSubtasks}/{task.subtasks.length}</Text>
            </View>
          }
        >
          {task.subtasks.map((st, i) => (
            <View key={st.id} style={[s.rowStart, { paddingVertical: 10, borderBottomWidth: i < task.subtasks.length - 1 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.04)' }]}>
              <View style={[s.check, { backgroundColor: st.done ? colors.green : 'transparent', borderColor: st.done ? colors.green : 'rgba(93,126,166,0.5)' }]}>
                {st.done && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
              </View>
              <Text style={[s.mutedXs, { marginLeft: 12, flex: 1, color: st.done ? colors.muted : colors.foreground, textDecorationLine: st.done ? 'line-through' : 'none' }]}>
                {st.title}
              </Text>
            </View>
          ))}
        </Accordion>

        {/* Action buttons */}
        <View style={s.grid2}>
          <TouchableOpacity
            style={[s.actionBtn, { flex: 1, marginHorizontal: 4 }]}
            onPress={() => navigation.navigate('TaskComments', { taskId: task.id, taskTitle: task.title })}
          >
            <MessageSquare size={16} color={colors.foreground} strokeWidth={1.75} />
            <Text style={[s.cardTitle, { marginLeft: 8, fontSize: 13 }]}>Comments</Text>
            <View style={[s.badge, { backgroundColor: 'rgba(255,255,255,0.08)', marginLeft: 8 }]}>
              <Text style={[s.badgeText, { color: colors.muted }]}>{commentCount}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { flex: 1, marginHorizontal: 4 }]}>
            <Paperclip size={16} color={colors.foreground} strokeWidth={1.75} />
            <Text style={[s.cardTitle, { marginLeft: 8, fontSize: 13 }]}>Attachments</Text>
            <View style={[s.badge, { backgroundColor: 'rgba(255,255,255,0.08)', marginLeft: 8 }]}>
              <Text style={[s.badgeText, { color: colors.muted }]}>0</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  stickyHeader: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: 'rgba(3,12,26,0.95)' },
  content:      { paddingHorizontal: 20, paddingTop: 12 },
  card:         { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  recCard:      { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12 },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accordionBody:   { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  mainTitle:    { fontSize: 22, fontWeight: '700', color: colors.foreground, lineHeight: 28 },
  cardTitle:    { fontSize: 14, fontWeight: '600', color: colors.foreground },
  bigNum:       { fontSize: 22, fontWeight: '600', color: colors.foreground },
  mutedXs:      { fontSize: 11, color: colors.muted },
  badge:        { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText:    { fontSize: 10, fontWeight: '600' },
  tagPill:      { backgroundColor: 'rgba(41,98,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText:      { fontSize: 11, fontWeight: '500', color: '#60A5FA' },
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowStart:     { flexDirection: 'row', alignItems: 'flex-start' },
  grid2:        { flexDirection: 'row', marginBottom: 12 },
  wrap:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconBtn:      { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  iconBox:      { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarSm:     { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarSmText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  actionBtn:    { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  acceptBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.blue, borderRadius: 10, paddingVertical: 8 },
  acceptBtnText:{ color: '#fff', fontSize: 12, fontWeight: '600' },
  check:        { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  barTrack:     { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 4 },
});
