import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, StyleSheet, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search, MoreVertical, Mail, MessageCircle,
  CheckCircle2, Clock, AlertTriangle, Plus, Sparkles,
} from 'lucide-react-native';
import { colors, AVATAR_GRADIENTS } from '../theme';

const STATUS_CONFIG = {
  online:  { dot: colors.green,  label: 'Online',     labelColor: colors.green,  labelBg: 'rgba(16,185,129,0.12)' },
  away:    { dot: colors.yellow, label: 'In Meeting',  labelColor: colors.yellow, labelBg: 'rgba(245,158,11,0.12)' },
  offline: { dot: colors.muted,  label: 'Offline',    labelColor: colors.muted,  labelBg: 'rgba(93,126,166,0.12)' },
} as const;

const teamMembers = [
  { id: 1, name: 'Sarah Chen',   role: 'Senior Engineer',  initials: 'SC', email: 'sarah@company.com', status: 'online' as const,  tasks: { active: 8, completed: 24, atRisk: 2 }, velocity: 95 },
  { id: 2, name: 'Mike Johnson', role: 'Product Designer',  initials: 'MJ', email: 'mike@company.com',  status: 'away' as const,    tasks: { active: 5, completed: 18, atRisk: 1 }, velocity: 88 },
  { id: 3, name: 'Alex Rivera',  role: 'Backend Engineer', initials: 'AR', email: 'alex@company.com',  status: 'online' as const,  tasks: { active: 6, completed: 15, atRisk: 3 }, velocity: 82 },
  { id: 4, name: 'Emma Davis',   role: 'QA Engineer',      initials: 'ED', email: 'emma@company.com',  status: 'online' as const,  tasks: { active: 7, completed: 21, atRisk: 0 }, velocity: 90 },
  { id: 5, name: 'John Smith',   role: 'DevOps Engineer',  initials: 'JS', email: 'john@company.com',  status: 'offline' as const, tasks: { active: 4, completed: 12, atRisk: 1 }, velocity: 85 },
];

function AnimatedBar({ target, delay }: { target: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: target, duration: 800, delay, useNativeDriver: false }).start();
  }, []);
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
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = teamMembers.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.headerRow}>
        <View>
          <Text style={s.subtitle}>Project Phoenix</Text>
          <Text style={s.title}>Team</Text>
        </View>
        <TouchableOpacity style={s.addBtn}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchBox}>
        <Search size={16} color={colors.muted} strokeWidth={1.75} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or role…"
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Performance overview */}
      <View style={[s.card, { borderColor: 'rgba(124,77,255,0.25)', backgroundColor: 'rgba(124,77,255,0.08)', marginTop: 12 }]}>
        <View style={s.row}>
          <Sparkles size={16} color={colors.purpleLight} />
          <Text style={[s.mutedXs, { color: colors.purpleLight, marginLeft: 8 }]}>TEAM PERFORMANCE · THIS SPRINT</Text>
        </View>
        <View style={s.statsRow}>
          {[
            { value: '30', label: 'Active Tasks', color: colors.foreground },
            { value: '90', label: 'Completed',    color: colors.green },
            { value: '88%', label: 'Avg Velocity', color: colors.foreground },
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
        {filtered.length} Members
      </Text>

      {/* Member cards */}
      {filtered.map((member, i) => {
        const statusCfg = STATUS_CONFIG[member.status];
        return (
          <FadeSlide key={member.id} delay={i * 60}>
            <View style={s.card}>
              {/* Avatar + info */}
              <View style={[s.row, { alignItems: 'flex-start', marginBottom: 16 }]}>
                <View style={{ position: 'relative', marginRight: 12 }}>
                  <LinearGradient colors={AVATAR_GRADIENTS[member.initials]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatar}>
                    <Text style={s.avatarText}>{member.initials}</Text>
                  </LinearGradient>
                  <View style={[s.statusDot, { backgroundColor: statusCfg.dot }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.memberName}>{member.name}</Text>
                  <Text style={[s.mutedXs, { marginBottom: 6 }]}>{member.role}</Text>
                  <View style={[s.statusBadge, { backgroundColor: statusCfg.labelBg }]}>
                    <Text style={[s.statusText, { color: statusCfg.labelColor }]}>{statusCfg.label}</Text>
                  </View>
                </View>
                <TouchableOpacity>
                  <MoreVertical size={16} color={colors.muted} />
                </TouchableOpacity>
              </View>

              {/* Stats */}
              <View style={s.statsRow}>
                {[
                  { value: member.tasks.active,    label: 'Active',  icon: Clock,          color: colors.foreground },
                  { value: member.tasks.completed, label: 'Done',    icon: CheckCircle2,   color: colors.green },
                  { value: member.tasks.atRisk,    label: 'At Risk', icon: AlertTriangle,  color: member.tasks.atRisk > 0 ? colors.red : colors.muted },
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

              {/* Velocity bar */}
              <View style={{ marginVertical: 12 }}>
                <View style={s.row}>
                  <Text style={s.mutedXs}>Velocity</Text>
                  <Text style={[s.mutedXs, { color: colors.foreground, fontWeight: '600' }]}>{member.velocity}%</Text>
                </View>
                <AnimatedBar target={member.velocity} delay={i * 60 + 200} />
              </View>

              {/* Actions */}
              <View style={s.actionsRow}>
                {[
                  { icon: MessageCircle, label: 'Message' },
                  { icon: Mail,          label: 'Email' },
                ].map(action => {
                  const Icon = action.icon;
                  return (
                    <TouchableOpacity key={action.label} style={s.actionBtn}>
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
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:      { flex: 1, backgroundColor: colors.bg },
  content:     { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  subtitle:    { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  title:       { fontSize: 26, fontWeight: '700', color: colors.foreground },
  addBtn:      { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(17,30,53,0.8)', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: colors.foreground },
  card:        { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  statsRow:    { flexDirection: 'row', gap: 8, marginTop: 8 },
  statBox:     { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, alignItems: 'center' },
  statValue:   { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar:      { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: '#fff', fontSize: 14, fontWeight: '700' },
  statusDot:   { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.card },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statusText:  { fontSize: 10, fontWeight: '500' },
  memberName:  { fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 2 },
  barTrack:    { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  barFill:     { height: '100%', borderRadius: 4, backgroundColor: colors.blue },
  actionsRow:  { flexDirection: 'row', gap: 8 },
  actionBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border },
  mutedXs:     { fontSize: 11, color: colors.muted },
});
