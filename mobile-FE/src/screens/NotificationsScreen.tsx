import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, StyleSheet,
} from 'react-native';
import {
  Bell, CheckCircle2, AlertTriangle, MessageSquare,
  UserPlus, Calendar, Sparkles, Settings, X,
} from 'lucide-react-native';
import { colors } from '../theme';

type FilterId = 'all' | 'unread' | 'ai';

const initialNotifications = [
  { id: 1, type: 'ai',       icon: Sparkles,       title: 'High Risk Detected',       message: '"API Migration" — 85% probability of missing deadline based on current velocity', time: '5 min ago', read: false, accentColor: colors.purpleLight, accentBg: 'rgba(124,77,255,0.12)' },
  { id: 2, type: 'task',     icon: CheckCircle2,   title: 'Task Completed',            message: 'Sarah Chen completed "Auth Flow & Session Management" — 2 days ahead of schedule', time: '1 hr ago', read: false, accentColor: colors.green, accentBg: 'rgba(16,185,129,0.12)' },
  { id: 3, type: 'comment',  icon: MessageSquare,  title: 'New Comment',               message: 'Mike Johnson left feedback on "User Dashboard Redesign" — 3 comments', time: '2 hr ago', read: false, accentColor: '#60A5FA', accentBg: 'rgba(41,98,255,0.12)' },
  { id: 4, type: 'team',     icon: UserPlus,       title: 'Team Update',               message: 'Alex Rivera joined Project Phoenix — now 6 members on the team', time: '3 hr ago', read: true, accentColor: '#818CF8', accentBg: 'rgba(99,102,241,0.12)' },
  { id: 5, type: 'deadline', icon: AlertTriangle,  title: 'Deadline Approaching',      message: '"Database Query Optimization" is due in 2 days with only 15% complete', time: '5 hr ago', read: true, accentColor: colors.yellow, accentBg: 'rgba(245,158,11,0.12)' },
  { id: 6, type: 'meeting',  icon: Calendar,       title: 'Meeting in 30 min',         message: 'Sprint planning with the full team — Zoom link in calendar', time: '6 hr ago', read: true, accentColor: '#34D399', accentBg: 'rgba(52,211,153,0.12)' },
  { id: 7, type: 'ai',       icon: Sparkles,       title: 'Workflow Insight',          message: 'Grouping 4 similar backend tasks could save an estimated 3 hours this week', time: 'Yesterday', read: true, accentColor: colors.purpleLight, accentBg: 'rgba(124,77,255,0.12)' },
];

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
  const [filter, setFilter] = useState<FilterId>('all');
  const [items, setItems] = useState(initialNotifications);

  const filters = [
    { id: 'all' as FilterId,    label: 'All',      count: items.length },
    { id: 'unread' as FilterId, label: 'Unread',   count: items.filter(n => !n.read).length },
    { id: 'ai' as FilterId,     label: 'AI Alerts', count: items.filter(n => n.type === 'ai').length },
  ];

  const filtered = items.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'ai') return n.type === 'ai';
    return true;
  });

  const unreadCount = items.filter(n => !n.read).length;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.headerRow}>
        <View>
          <Text style={s.subtitle}>Today</Text>
          <View style={s.row}>
            <Text style={s.title}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={s.unreadBadge}>
                <Text style={s.unreadText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity style={s.iconBtn}>
          <Settings size={20} color={colors.muted} strokeWidth={1.75} />
        </TouchableOpacity>
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
        <TouchableOpacity style={[s.actionBtn, { flex: 1 }]} onPress={() => setItems(prev => prev.map(n => ({ ...n, read: true })))}>
          <Text style={s.actionText}>Mark all read</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, { flex: 1 }]} onPress={() => setItems([])}>
          <Text style={[s.actionText, { color: colors.muted }]}>Clear all</Text>
        </TouchableOpacity>
      </View>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <View style={[s.emptyCard]}>
          <Bell size={40} color={colors.muted} strokeWidth={1.5} />
          <Text style={[s.mutedSm, { marginTop: 12 }]}>No notifications</Text>
        </View>
      ) : (
        filtered.map((n, i) => {
          const Icon = n.icon;
          return (
            <FadeSlide key={n.id} delay={i * 40}>
              <View style={[s.notifCard, { borderColor: n.read ? colors.border : 'rgba(41,98,255,0.25)' }]}>
                {!n.read && <View style={s.unreadStripe} />}
                <View style={{ flex: 1, padding: 16 }}>
                  <View style={s.rowStart}>
                    <View style={[s.iconBox, { backgroundColor: n.accentBg }]}>
                      <Icon size={16} color={n.accentColor} strokeWidth={1.75} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={[s.row, { marginBottom: 4 }]}>
                        <View style={s.row}>
                          <Text style={s.notifTitle}>{n.title}</Text>
                          {!n.read && <View style={s.dot} />}
                        </View>
                        <TouchableOpacity onPress={() => setItems(prev => prev.filter(x => x.id !== n.id))}>
                          <X size={14} color={colors.muted} />
                        </TouchableOpacity>
                      </View>
                      <Text style={[s.mutedXs, { lineHeight: 18, marginBottom: 8 }]}>{n.message}</Text>
                      <Text style={[s.mutedXs, { opacity: 0.7 }]}>{n.time}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </FadeSlide>
          );
        })
      )}
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
  iconBtn:       { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(17,30,53,0.8)', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  iconBox:       { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filterPill:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, gap: 6 },
  filterText:    { fontSize: 12, fontWeight: '600' },
  filterCount:   { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  filterCountText: { fontSize: 10, fontWeight: '600' },
  actionBtn:     { backgroundColor: 'rgba(17,30,53,0.8)', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  actionText:    { fontSize: 12, fontWeight: '600', color: colors.foreground },
  notifCard:     { backgroundColor: colors.card, borderWidth: 1, borderRadius: 16, flexDirection: 'row', overflow: 'hidden', marginBottom: 10 },
  unreadStripe:  { width: 3, backgroundColor: colors.blue },
  notifTitle:    { fontSize: 13, fontWeight: '600', color: colors.foreground },
  dot:           { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.blue, marginLeft: 6 },
  unreadBadge:   { backgroundColor: colors.blue, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, marginLeft: 8 },
  unreadText:    { fontSize: 11, fontWeight: '600', color: '#fff' },
  emptyCard:     { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 48, alignItems: 'center' },
  mutedSm:       { fontSize: 13, color: colors.muted },
  mutedXs:       { fontSize: 12, color: colors.muted },
});
