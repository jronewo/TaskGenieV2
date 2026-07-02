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
  Clock, TrendingUp, Sparkles,
} from 'lucide-react-native';
import { colors, AVATAR_GRADIENTS } from '../theme';

const tasks: Record<string, any> = {
  '1': {
    title: 'API Migration to GraphQL',
    status: 'In Progress', priority: 'High',
    description: 'Migrate the legacy REST API endpoints to GraphQL. Includes schema design, resolver implementation, auth layer, and backward-compatibility shims for mobile clients on v2.3 and below.',
    assignee: { name: 'Sarah Chen', initials: 'SC', email: 'sarah@company.com' },
    dueDate: '2026-05-27', progress: 45, risk: 85,
    tags: ['Backend', 'Critical', 'API'],
    subtasks: [
      { id: 1, title: 'Design GraphQL schema', done: true },
      { id: 2, title: 'Implement core resolvers', done: true },
      { id: 3, title: 'Add authentication layer', done: false },
      { id: 4, title: 'Write integration tests', done: false },
      { id: 5, title: 'Deploy to staging', done: false },
    ],
  },
  '2': {
    title: 'User Dashboard Redesign',
    status: 'In Review', priority: 'Medium',
    description: 'Redesign the analytics dashboard with a focus on data density and mobile readability. Follows the new design system tokens.',
    assignee: { name: 'Mike Johnson', initials: 'MJ', email: 'mike@company.com' },
    dueDate: '2026-05-28', progress: 80, risk: 20,
    tags: ['Frontend', 'Design'],
    subtasks: [
      { id: 1, title: 'Wireframes approved', done: true },
      { id: 2, title: 'Component build', done: true },
      { id: 3, title: 'QA sign-off', done: false },
    ],
  },
};

const PRIORITY_CONFIG = {
  High:   { stripe: colors.red,    badgeBg: 'rgba(239,68,68,0.12)',   badgeColor: colors.red },
  Medium: { stripe: colors.yellow, badgeBg: 'rgba(245,158,11,0.12)',  badgeColor: colors.yellow },
  Low:    { stripe: colors.green,  badgeBg: 'rgba(16,185,129,0.12)',  badgeColor: colors.green },
} as const;

function AnimatedBar({ progress, color }: { progress: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: progress, duration: 1000, useNativeDriver: false }).start();
  }, []);
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
  const task = tasks[id] ?? tasks['1'];
  const pCfg = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.Medium;
  const completedSubtasks = task.subtasks.filter((s: any) => s.done).length;
  const dueShort = new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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
              <LinearGradient colors={AVATAR_GRADIENTS[task.assignee.initials]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatarSm}>
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
          {task.tags.map((tag: string) => (
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

        {/* Subtasks */}
        <Accordion
          title="Subtasks"
          badge={
            <View style={[s.badge, { backgroundColor: 'rgba(41,98,255,0.12)', marginLeft: 8 }]}>
              <Text style={[s.badgeText, { color: '#60A5FA' }]}>{completedSubtasks}/{task.subtasks.length}</Text>
            </View>
          }
        >
          {task.subtasks.map((st: any) => (
            <View key={st.id} style={[s.rowStart, { paddingVertical: 10, borderBottomWidth: st.id < task.subtasks.length ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.04)' }]}>
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
          {[
            { icon: MessageSquare, label: 'Comments',    count: 5 },
            { icon: Paperclip,     label: 'Attachments', count: 3 },
          ].map(btn => {
            const Icon = btn.icon;
            return (
              <TouchableOpacity key={btn.label} style={[s.actionBtn, { flex: 1, marginHorizontal: 4 }]}>
                <Icon size={16} color={colors.foreground} strokeWidth={1.75} />
                <Text style={[s.cardTitle, { marginLeft: 8, fontSize: 13 }]}>{btn.label}</Text>
                <View style={[s.badge, { backgroundColor: 'rgba(255,255,255,0.08)', marginLeft: 8 }]}>
                  <Text style={[s.badgeText, { color: colors.muted }]}>{btn.count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
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
  check:        { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  barTrack:     { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 4 },
});
