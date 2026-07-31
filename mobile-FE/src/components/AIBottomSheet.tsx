import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, StyleSheet, Dimensions, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { X, Sparkles, AlertTriangle, Zap, TrendingUp, RefreshCw } from 'lucide-react-native';
import { colors } from '../theme';
import { ApiError, aiApi, tasksApi, type TaskDetail } from '../api';
import { useApiQuery } from '../hooks/useApi';
import { useProjects } from '../contexts/ProjectContext';
import { LoadingState, ErrorState, EmptyState } from './StateViews';
import { daysUntilDeadline, formatDeadline } from '../utils/task';

const { height: SCREEN_H } = Dimensions.get('window');

interface Suggestion {
  key: string;
  icon: typeof Zap;
  title: string;
  description: string;
  action: string;
  taskId?: number;
  accentColor: string;
  accentBg: string;
  borderColor: string;
}

const PALETTE = {
  danger: { accentColor: colors.red, accentBg: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' },
  warn: { accentColor: colors.yellow, accentBg: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' },
  info: { accentColor: '#60A5FA', accentBg: 'rgba(41,98,255,0.08)', borderColor: 'rgba(41,98,255,0.2)' },
  good: { accentColor: colors.green, accentBg: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' },
};

/** Turns raw project data into the same card shape the sheet already renders. */
function buildSuggestions(
  tasks: TaskDetail[],
  workload: { userName: string; suggestedTasks: string[]; reason: string }[],
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const task of tasks) {
    if ((task.riskLevel ?? '').toUpperCase() !== 'HIGH') continue;
    suggestions.push({
      key: `risk-${task.taskId}`,
      icon: AlertTriangle,
      title: `Rủi ro cao — ${task.title}`,
      description: task.aiSummary
        ?? `Hạn ${formatDeadline(task.deadline)}, tiến độ ${task.progress ?? 0}%.`,
      action: 'Xem chi tiết task',
      taskId: task.taskId,
      ...PALETTE.danger,
    });
  }

  const overdue = tasks.filter(
    t => t.status !== 'Done' && (daysUntilDeadline(t.deadline) ?? 1) < 0,
  );
  if (overdue.length > 0) {
    suggestions.push({
      key: 'overdue',
      icon: AlertTriangle,
      title: `${overdue.length} task đã quá hạn`,
      description: overdue.map(t => t.title).filter(Boolean).slice(0, 3).join(' · '),
      action: 'Cập nhật tiến độ',
      taskId: overdue[0].taskId,
      ...PALETTE.warn,
    });
  }

  const unassigned = tasks.filter(t => t.status !== 'Done' && t.assignees.length === 0);
  if (unassigned.length > 0) {
    suggestions.push({
      key: 'unassigned',
      icon: Zap,
      title: `${unassigned.length} task chưa có người nhận`,
      description: unassigned.map(t => t.title).filter(Boolean).slice(0, 3).join(' · '),
      action: 'Phân công ngay',
      taskId: unassigned[0].taskId,
      ...PALETTE.info,
    });
  }

  for (const item of workload) {
    if (item.suggestedTasks.length === 0) continue;
    suggestions.push({
      key: `workload-${item.userName}`,
      icon: TrendingUp,
      title: `Gợi ý cho ${item.userName}`,
      description: `${item.reason} — ${item.suggestedTasks.slice(0, 3).join(', ')}`,
      action: 'Xem bảng công việc',
      ...PALETTE.good,
    });
  }

  return suggestions;
}

interface Props { onClose: () => void; }

export default function AIBottomSheet({ onClose }: Props) {
  const navigation = useNavigation<any>();
  const { activeProject, activeProjectId } = useProjects();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, damping: 32, stiffness: 320, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 280, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose, slideAnim, backdropOpacity]);

  const tasksQuery = useApiQuery<TaskDetail[]>(
    signal => tasksApi.getByProject(activeProjectId!, signal),
    [activeProjectId],
    { enabled: activeProjectId !== null },
  );

  const workloadQuery = useApiQuery(
    signal => aiApi.getWorkloadSuggestions(activeProjectId!, signal),
    [activeProjectId],
    { enabled: activeProjectId !== null },
  );

  const suggestions = useMemo(
    () => buildSuggestions(tasksQuery.data ?? [], workloadQuery.data?.suggestions ?? []),
    [tasksQuery.data, workloadQuery.data],
  );

  const runProjectAnalysis = useCallback(async () => {
    if (activeProjectId === null) return;
    setIsAnalyzing(true);
    try {
      await aiApi.analyzeProjectRisks(activeProjectId);
      tasksQuery.refetch();
      workloadQuery.refetch();
    } catch (err) {
      Alert.alert('Phân tích thất bại', err instanceof ApiError ? err.message : 'Đã xảy ra lỗi.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [activeProjectId, tasksQuery, workloadQuery]);

  const openSuggestion = useCallback(
    (suggestion: Suggestion) => {
      handleClose();
      if (suggestion.taskId !== undefined) {
        navigation.navigate('TaskDetail', { taskId: suggestion.taskId });
      } else {
        // The FAB lives outside the tab navigator, so target the nested route.
        navigation.navigate('Tabs', { screen: 'Board' });
      }
    },
    [handleClose, navigation],
  );

  const renderBody = () => {
    if (activeProjectId === null) return <EmptyState message="Bạn chưa thuộc dự án nào." />;
    if (tasksQuery.isLoading) return <LoadingState label="Đang phân tích dự án…" />;
    if (tasksQuery.error) return <ErrorState error={tasksQuery.error} onRetry={tasksQuery.refetch} />;
    if (suggestions.length === 0) {
      return <EmptyState message="Không có cảnh báo nào. Dự án đang trong tầm kiểm soát." />;
    }
    return null;
  };

  const body = renderBody();

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
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>AI Assistant</Text>
              <Text style={s.mutedXs} numberOfLines={1}>
                {activeProject
                  ? `${suggestions.length} gợi ý · ${activeProject.name}`
                  : 'Chưa chọn dự án'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={s.closeBtn}
              onPress={runProjectAnalysis}
              disabled={isAnalyzing || activeProjectId === null}
            >
              {isAnalyzing
                ? <ActivityIndicator size="small" color={colors.muted} />
                : <RefreshCw size={16} color={colors.muted} />}
            </TouchableOpacity>
            <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
              <X size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Suggestions */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
          {body}

          {suggestions.map(suggestion => {
            const Icon = suggestion.icon;
            return (
              <TouchableOpacity
                key={suggestion.key}
                style={[s.suggCard, { backgroundColor: suggestion.accentBg, borderColor: suggestion.borderColor }]}
                onPress={() => openSuggestion(suggestion)}
                activeOpacity={0.8}
              >
                <View style={[s.suggIcon, { backgroundColor: suggestion.accentColor + '20' }]}>
                  <Icon size={16} color={suggestion.accentColor} strokeWidth={1.75} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.suggTitle}>{suggestion.title}</Text>
                  <Text style={[s.mutedXs, { lineHeight: 18, marginVertical: 6 }]}>
                    {suggestion.description}
                  </Text>
                  <Text style={[s.mutedXs, { color: suggestion.accentColor, fontWeight: '600' }]}>
                    {suggestion.action} →
                  </Text>
                </View>
              </TouchableOpacity>
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
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 },
  headerIcon:  { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(124,77,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  closeBtn:    { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  list:        { padding: 20, gap: 12 },
  suggCard:    { borderRadius: 16, padding: 16, borderWidth: 1, flexDirection: 'row' },
  suggIcon:    { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  suggTitle:   { fontSize: 13, fontWeight: '600', color: colors.foreground },
  mutedXs:     { fontSize: 12, color: colors.muted },
});
