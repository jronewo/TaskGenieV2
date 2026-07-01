import React, { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, StyleSheet, Dimensions, Modal,
} from 'react-native';
import { X, Sparkles, Clock, AlertTriangle, Zap, TrendingUp } from 'lucide-react-native';
import { colors } from '../theme';

const { height: SCREEN_H } = Dimensions.get('window');

const suggestions = [
  { icon: AlertTriangle, title: 'High Risk — API Migration',    description: '85% probability of missing the May 27 deadline. Auth layer is the critical blocker.', action: 'Reassign resources', accentColor: colors.red,    accentBg: 'rgba(239,68,68,0.1)',    borderColor: 'rgba(239,68,68,0.2)' },
  { icon: Clock,          title: 'Schedule Optimization',       description: '3 tasks can be sequenced differently to free up 2 days before the sprint ends.', action: 'Optimize timeline',   accentColor: colors.yellow, accentBg: 'rgba(245,158,11,0.08)',  borderColor: 'rgba(245,158,11,0.2)' },
  { icon: Zap,            title: 'Quick Win Available',         description: '5 low-complexity tasks are unassigned and can be completed before Monday.', action: 'View tasks',          accentColor: '#60A5FA',     accentBg: 'rgba(41,98,255,0.08)',   borderColor: 'rgba(41,98,255,0.2)' },
  { icon: TrendingUp,     title: 'Velocity Up 23%',             description: "Team momentum is strong — you're on pace to beat last sprint by 7 tasks.", action: 'View analytics',     accentColor: colors.green,  accentBg: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' },
];

interface Props { onClose: () => void; }

export default function AIBottomSheet({ onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, damping: 32, stiffness: 320, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 280, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  return (
    <Modal transparent statusBarTranslucent animationType="none" onRequestClose={handleClose}>
      {/* Backdrop */}
      <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={s.handleWrap}>
          <View style={s.handle} />
        </View>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.headerIcon}>
              <Sparkles size={16} color={colors.purpleLight} strokeWidth={1.75} />
            </View>
            <View>
              <Text style={s.headerTitle}>AI Assistant</Text>
              <Text style={s.mutedXs}>4 insights for Sprint 14</Text>
            </View>
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
            <X size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Suggestions */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
          {suggestions.map((s_, i) => {
            const Icon = s_.icon;
            return (
              <View key={i} style={[s.suggCard, { backgroundColor: s_.accentBg, borderColor: s_.borderColor }]}>
                <View style={[s.suggIcon, { backgroundColor: s_.accentColor + '20' }]}>
                  <Icon size={16} color={s_.accentColor} strokeWidth={1.75} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.suggTitle}>{s_.title}</Text>
                  <Text style={[s.mutedXs, { lineHeight: 18, marginVertical: 6 }]}>{s_.description}</Text>
                  <Text style={[s.mutedXs, { color: s_.accentColor, fontWeight: '600' }]}>{s_.action} →</Text>
                </View>
              </View>
            );
          })}
          <View style={{ height: 20 }} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 40 },
  sheet:       { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: SCREEN_H * 0.82, backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', zIndex: 50 },
  handleWrap:  { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon:  { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(124,77,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  closeBtn:    { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  list:        { padding: 20, gap: 12 },
  suggCard:    { borderRadius: 16, padding: 16, borderWidth: 1, flexDirection: 'row' },
  suggIcon:    { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  suggTitle:   { fontSize: 13, fontWeight: '600', color: colors.foreground },
  mutedXs:     { fontSize: 12, color: colors.muted },
});
