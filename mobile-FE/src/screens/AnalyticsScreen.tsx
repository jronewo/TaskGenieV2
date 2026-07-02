import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, StyleSheet, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react-native';
import { colors, AVATAR_GRADIENTS } from '../theme';

const { width } = Dimensions.get('window');
const CHART_W = width - 40;
const CHART_H = 160;

const velocityData = [
  { day: 'Mon', v: 85 }, { day: 'Tue', v: 92 }, { day: 'Wed', v: 88 },
  { day: 'Thu', v: 95 }, { day: 'Fri', v: 90 }, { day: 'Sat', v: 75 }, { day: 'Sun', v: 60 },
];

const riskData = [
  { week: 'Wk 1', low: 12, medium: 5, high: 2 },
  { week: 'Wk 2', low: 15, medium: 4, high: 3 },
  { week: 'Wk 3', low: 18, medium: 6, high: 1 },
  { week: 'Wk 4', low: 20, medium: 3, high: 2 },
];

const metrics = [
  { label: 'Avg Velocity', value: '92', unit: '%', change: '+8 pts',   up: true },
  { label: 'Completed',    value: '64', unit: '',  change: '+12 tasks', up: true },
  { label: 'At Risk',      value: '3',  unit: '',  change: '−2 tasks',  up: false },
  { label: 'Cycle Time',   value: '3.2', unit: 'd', change: '−0.5d',   up: true },
];

const teamPerformance = [
  { name: 'Sarah Chen',  initials: 'SC', completed: 18, velocity: 95 },
  { name: 'Emma Davis',  initials: 'ED', completed: 14, velocity: 90 },
  { name: 'Mike Johnson', initials: 'MJ', completed: 15, velocity: 88 },
  { name: 'Alex Rivera', initials: 'AR', completed: 12, velocity: 82 },
];

function AnimatedBar({ target, color, delay }: { target: number; color: string; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: target, duration: 800, delay, useNativeDriver: false }).start();
  }, []);
  return (
    <View style={s.barTrack}>
      <Animated.View style={[s.barFill, { backgroundColor: color, width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
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

function SimpleLineChart() {
  const minV = 50; const maxV = 100;
  const pts = velocityData.map((d, i) => ({
    x: (i / (velocityData.length - 1)) * (CHART_W - 32),
    y: CHART_H - ((d.v - minV) / (maxV - minV)) * CHART_H,
  }));
  return (
    <View style={{ height: CHART_H + 24, width: CHART_W - 32 }}>
      <View style={{ position: 'relative', height: CHART_H }}>
        {/* Grid lines */}
        {[60, 70, 80, 90, 100].map(val => {
          const y = CHART_H - ((val - minV) / (maxV - minV)) * CHART_H;
          return (
            <View key={val} style={{ position: 'absolute', top: y, left: 0, right: 0, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: colors.muted, width: 28 }}>{val}</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' }} />
            </View>
          );
        })}
        {/* Dots and line simulation */}
        {pts.map((pt, i) => (
          <View key={i} style={{ position: 'absolute', left: 28 + pt.x - 4, top: pt.y - 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue }} />
          </View>
        ))}
      </View>
      {/* Day labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingLeft: 28 }}>
        {velocityData.map(d => (
          <Text key={d.day} style={{ fontSize: 10, color: colors.muted }}>{d.day}</Text>
        ))}
      </View>
    </View>
  );
}

function SimpleBarChart() {
  const maxVal = 25;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 120 }}>
        {riskData.map(d => {
          const total = d.low + d.medium + d.high;
          return (
            <View key={d.week} style={{ alignItems: 'center', gap: 2 }}>
              <View style={{ width: 32, overflow: 'hidden', borderRadius: 6 }}>
                <View style={{ height: (d.high / maxVal) * 100, backgroundColor: colors.red }} />
                <View style={{ height: (d.medium / maxVal) * 100, backgroundColor: colors.yellow }} />
                <View style={{ height: (d.low / maxVal) * 100, backgroundColor: colors.green }} />
              </View>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 }}>
        {riskData.map(d => (
          <Text key={d.week} style={{ fontSize: 10, color: colors.muted }}>{d.week}</Text>
        ))}
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const [timeframe, setTimeframe] = useState('week');

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.subtitle}>Sprint 14 · Q2 2026</Text>
      <Text style={s.title}>Analytics</Text>

      {/* Timeframe selector */}
      <View style={s.segmented}>
        {['day', 'week', 'month'].map(p => (
          <TouchableOpacity
            key={p}
            onPress={() => setTimeframe(p)}
            style={[s.segmentBtn, { backgroundColor: timeframe === p ? colors.blue : 'transparent' }]}
          >
            <Text style={[s.segmentText, { color: timeframe === p ? '#fff' : colors.muted }]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Metric cards */}
      <View style={s.grid2}>
        {metrics.map((m, i) => (
          <FadeSlide key={i} delay={i * 60}>
            <View style={[s.card, s.metricCard]}>
              <View style={[s.row, { marginBottom: 12 }]}>
                <Text style={s.mutedXs}>{m.label}</Text>
                <View style={s.row}>
                  {m.up
                    ? <TrendingUp size={12} color={colors.green} />
                    : <TrendingDown size={12} color={colors.red} />}
                  <Text style={[s.mutedXs, { color: m.up ? colors.green : colors.red, marginLeft: 4 }]}>{m.change}</Text>
                </View>
              </View>
              <View style={s.row}>
                <Text style={s.bigNum}>{m.value}</Text>
                {m.unit ? <Text style={s.mutedXs}>{m.unit}</Text> : null}
              </View>
            </View>
          </FadeSlide>
        ))}
      </View>

      {/* Velocity chart */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Team Velocity</Text>
        <View style={{ marginTop: 16 }}>
          <SimpleLineChart />
        </View>
      </View>

      {/* Risk distribution */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Risk Distribution</Text>
        <View style={{ marginTop: 16 }}>
          <SimpleBarChart />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 12 }}>
          {[{ color: colors.green, label: 'Low' }, { color: colors.yellow, label: 'Medium' }, { color: colors.red, label: 'High' }].map(l => (
            <View key={l.label} style={s.legend}>
              <View style={[s.legendDot, { backgroundColor: l.color }]} />
              <Text style={s.mutedXs}>{l.label} Risk</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Top Performers */}
      <View style={s.card}>
        <Text style={[s.cardTitle, { marginBottom: 16 }]}>Top Performers</Text>
        {teamPerformance.map((member, i) => (
          <View key={i} style={{ marginBottom: i < teamPerformance.length - 1 ? 16 : 0 }}>
            <View style={[s.row, { marginBottom: 6 }]}>
              <View style={s.row}>
                <LinearGradient colors={AVATAR_GRADIENTS[member.initials]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatarSm}>
                  <Text style={s.avatarText}>{member.initials}</Text>
                </LinearGradient>
                <View style={{ marginLeft: 10 }}>
                  <Text style={s.cardTitle}>{member.name}</Text>
                </View>
              </View>
              <View style={s.row}>
                <Text style={s.mutedXs}>{member.completed} tasks  </Text>
                <Text style={[s.cardTitle, { fontSize: 13 }]}>{member.velocity}%</Text>
              </View>
            </View>
            <AnimatedBar target={member.velocity} color={colors.blue} delay={i * 100 + 300} />
          </View>
        ))}
      </View>

      {/* AI Forecast */}
      <View style={[s.card, { borderColor: 'rgba(124,77,255,0.25)', backgroundColor: 'rgba(124,77,255,0.08)' }]}>
        <View style={s.row}>
          <View style={[s.iconBox, { backgroundColor: 'rgba(124,77,255,0.2)' }]}>
            <Sparkles size={16} color={colors.purpleLight} strokeWidth={1.75} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[s.mutedXs, { color: colors.purpleLight, marginBottom: 4 }]}>AI FORECAST</Text>
            <Text style={s.cardTitle}>Sprint 15 projected 23% faster based on current momentum</Text>
            <Text style={[s.mutedXs, { color: colors.purpleLight, marginTop: 8 }]}>View detailed forecast →</Text>
          </View>
        </View>
      </View>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:       { flex: 1, backgroundColor: colors.bg },
  content:      { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  subtitle:     { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  title:        { fontSize: 26, fontWeight: '700', color: colors.foreground, marginBottom: 20 },
  segmented:    { flexDirection: 'row', backgroundColor: 'rgba(17,30,53,0.8)', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 4, marginBottom: 16 },
  segmentBtn:   { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentText:  { fontSize: 12, fontWeight: '600' },
  grid2:        { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 4 },
  card:         { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  metricCard:   { flex: 1, margin: 4 },
  cardTitle:    { fontSize: 14, fontWeight: '600', color: colors.foreground },
  bigNum:       { fontSize: 30, fontWeight: '600', color: colors.foreground },
  mutedXs:      { fontSize: 11, color: colors.muted },
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBox:      { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarSm:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { color: '#fff', fontSize: 10, fontWeight: '700' },
  barTrack:     { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  barFill:      { height: '100%', borderRadius: 4 },
  legend:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:    { width: 8, height: 8, borderRadius: 4 },
});
