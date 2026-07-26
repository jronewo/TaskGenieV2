import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, StyleSheet, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCircle2, Clock, AlertCircle, TrendingUp, ChevronRight, Sparkles,
} from 'lucide-react-native';
import { colors, AVATAR_GRADIENTS } from '../theme';

const PRIORITY_CONFIG = {
  High:   { stripe: colors.red,    badgeBg: 'rgba(239,68,68,0.12)',   badgeColor: colors.red },
  Medium: { stripe: colors.yellow, badgeBg: 'rgba(245,158,11,0.12)',  badgeColor: colors.yellow },
  Low:    { stripe: colors.green,  badgeBg: 'rgba(16,185,129,0.12)',  badgeColor: colors.green },
} as const;

const stats = [
  { label: 'Active Tasks', value: '24', change: '+12%', up: true,  icon: CheckCircle2 },
  { label: 'In Progress',  value: '8',  change: '+5%',  up: true,  icon: Clock },
  { label: 'At Risk',      value: '3',  change: '−2 tasks', up: false, icon: AlertCircle },
  { label: 'Velocity',     value: '92%', change: '+8 pts', up: true, icon: TrendingUp },
];

const recentTasks = [
  { id: '1', title: 'API Migration to GraphQL',    status: 'In Progress', priority: 'High' as const,   assignee: 'Sarah Chen', avatarKey: 'SC', risk: 85, progress: 45, due: 'May 27' },
  { id: '2', title: 'User Dashboard Redesign',     status: 'In Review',   priority: 'Medium' as const, assignee: 'Mike Johnson', avatarKey: 'MJ', risk: 20, progress: 80, due: 'May 28' },
  { id: '3', title: 'Database Query Optimization', status: 'To Do',       priority: 'High' as const,   assignee: 'Alex Rivera', avatarKey: 'AR', risk: 60, progress: 15, due: 'May 30' },
];

function AnimatedBar({ progress, color, delay }: { progress: number; color: string; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: progress, duration: 900, delay, useNativeDriver: false }).start();
  }, []);
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

export default function DashboardScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.subtitle}>Mon, May 25 — Q2 Sprint</Text>
          <Text style={s.title}>
            Good morning, <Text style={{ color: colors.blue }}>Sarah</Text>
          </Text>
        </View>
        <LinearGradient colors={AVATAR_GRADIENTS['SC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatar}>
          <Text style={s.avatarText}>SC</Text>
        </LinearGradient>
      </View>

      {/* Sprint progress */}
      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.cardLabel}>Sprint 14 · Week 3 of 4</Text>
          <Text style={s.mutedSm}>21/30 days</Text>
        </View>
        <View style={s.barTrack}>
          <LinearGradient colors={[colors.blue, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.barFill, { width: '70%' }]} />
        </View>
        <View style={s.row}>
          <Text style={s.mutedXs}>32 tasks completed</Text>
          <Text style={s.mutedXs}>8 remaining</Text>
        </View>
      </View>

      {/* Stats grid */}
      <View style={s.grid2}>
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <FadeSlide key={i} delay={i * 70}>
              <View style={[s.card, s.statCard]}>
                <View style={s.row}>
                  <Icon size={16} color={colors.muted} strokeWidth={1.75} />
                  <View style={[s.badge, { backgroundColor: stat.up ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                    <Text style={[s.badgeText, { color: stat.up ? colors.green : colors.red }]}>{stat.change}</Text>
                  </View>
                </View>
                <Text style={s.statValue}>{stat.value}</Text>
                <Text style={s.mutedXs}>{stat.label}</Text>
              </View>
            </FadeSlide>
          );
        })}
      </View>

      {/* AI Insight */}
      <View style={[s.card, { borderColor: 'rgba(124,77,255,0.25)', backgroundColor: 'rgba(124,77,255,0.08)' }]}>
        <View style={s.rowStart}>
          <View style={[s.iconBox, { backgroundColor: 'rgba(124,77,255,0.2)' }]}>
            <Sparkles size={16} color={colors.purpleLight} strokeWidth={1.75} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.mutedXs, { color: colors.purpleLight, marginBottom: 4 }]}>AI INSIGHT</Text>
            <Text style={s.cardLabel}>Team velocity up 23% — on track to exceed sprint goals</Text>
            <Text style={[s.mutedXs, { marginTop: 2 }]}>Projected to complete 7 more tasks than last sprint</Text>
          </View>
        </View>
      </View>

      {/* Recent Tasks */}
      <View style={s.row}>
        <Text style={s.sectionTitle}>Recent Tasks</Text>
        <TouchableOpacity style={s.row} onPress={() => navigation.navigate('Board', { projectId: 1 })}>
          <Text style={[s.mutedXs, { color: colors.blue }]}>View all </Text>
          <ChevronRight size={14} color={colors.blue} />
        </TouchableOpacity>
      </View>

      {recentTasks.map((task, i) => {
        const pCfg = PRIORITY_CONFIG[task.priority];
        return (
          <FadeSlide key={task.id} delay={280 + i * 80}>
            <TouchableOpacity
              style={s.taskCard}
              onPress={() => navigation.navigate('TaskDetail', { id: task.id })}
              activeOpacity={0.8}
            >
              <View style={[s.taskStripe, { backgroundColor: pCfg.stripe }]} />
              <View style={{ flex: 1, padding: 16 }}>
                <View style={[s.row, { marginBottom: 8 }]}>
                  <Text style={[s.cardLabel, { flex: 1 }]}>{task.title}</Text>
                  <View style={[s.badge, { backgroundColor: pCfg.badgeBg }]}>
                    <Text style={[s.badgeText, { color: pCfg.badgeColor }]}>{task.priority}</Text>
                  </View>
                </View>
                <View style={[s.row, { marginBottom: 12 }]}>
                  <View style={[s.pill, { backgroundColor: 'rgba(41,98,255,0.12)' }]}>
                    <Text style={[s.badgeText, { color: '#60A5FA' }]}>{task.status}</Text>
                  </View>
                  <Text style={s.mutedXs}> · </Text>
                  <LinearGradient colors={AVATAR_GRADIENTS[task.avatarKey]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatarXs}>
                    <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{task.avatarKey}</Text>
                  </LinearGradient>
                  <Text style={[s.mutedXs, { marginLeft: 4 }]}>{task.assignee}</Text>
                </View>
                <View style={s.row}>
                  <Text style={s.mutedXs}>Progress</Text>
                  <Text style={[s.mutedXs, { color: colors.foreground }]}>{task.progress}%</Text>
                </View>
                <AnimatedBar progress={task.progress} color={pCfg.stripe} delay={400 + i * 100} />
                <View style={[s.row, { marginTop: 10 }]}>
                  <Text style={s.mutedXs}>Due {task.due}</Text>
                  {task.risk > 60 && <Text style={[s.mutedXs, { color: colors.red }]}>{task.risk}% delay risk</Text>}
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
