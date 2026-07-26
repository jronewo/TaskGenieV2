import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  Animated, StyleSheet, PanResponder, RefreshControl, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, MoreVertical, Clock, AlertTriangle, Trash2 } from 'lucide-react-native';
import { colors } from '../theme';
import { ApiError, tasksApi, type TaskDetail } from '../api';
import { useApiQuery, useRefetchOnFocus } from '../hooks/useApi';
import { useProjects } from '../contexts/ProjectContext';
import { LoadingState, ErrorState, EmptyState } from '../components/StateViews';
import ProjectPicker from '../components/ProjectPicker';
import CreateTaskModal from '../components/CreateTaskModal';
import { gradientFor, getInitials } from '../utils/avatar';
import {
  priorityStyle, statusLabel, formatDeadline, primaryAssignee, riskPercent,
  TASK_STATUSES, type KnownStatus,
} from '../utils/task';

const COLUMNS: { id: KnownStatus; title: string }[] = [
  { id: 'Todo', title: 'To Do' },
  { id: 'InProgress', title: 'In Progress' },
  { id: 'Done', title: 'Done' },
];

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

export default function KanbanBoardScreen() {
  const navigation = useNavigation<any>();
  const { activeProjectId, isLoading: isLoadingProjects } = useProjects();

  const [activeColumn, setActiveColumn] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [menuTask, setMenuTask] = useState<TaskDetail | null>(null);

  const { data, error, isLoading, isRefreshing, refetch } = useApiQuery(
    signal => tasksApi.getByProject(activeProjectId!, signal),
    [activeProjectId],
    { enabled: activeProjectId !== null },
  );
  useRefetchOnFocus(refetch, activeProjectId !== null);

  const tasks = useMemo(() => data ?? [], [data]);

  const byStatus = useMemo(() => {
    const groups: Record<KnownStatus, TaskDetail[]> = { Todo: [], InProgress: [], Done: [] };
    for (const task of tasks) {
      const status = (TASK_STATUSES as readonly string[]).includes(task.status ?? '')
        ? (task.status as KnownStatus)
        : 'Todo';
      groups[status].push(task);
    }
    return groups;
  }, [tasks]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 10,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -50) setActiveColumn(c => Math.min(c + 1, COLUMNS.length - 1));
          if (g.dx > 50) setActiveColumn(c => Math.max(c - 1, 0));
        },
      }),
    [],
  );

  const moveTo = useCallback(
    async (task: TaskDetail, status: KnownStatus) => {
      setMenuTask(null);
      try {
        // Done implies full progress; the backend keeps the two fields independent.
        await tasksApi.updateProgress(task.taskId, {
          status,
          progress: status === 'Done' ? 100 : task.progress,
        });
      } catch (err) {
        // The API rejects completing a task whose dependencies are unfinished.
        Alert.alert(
          'Không thể đổi trạng thái',
          err instanceof ApiError ? err.message : 'Đã xảy ra lỗi.',
        );
        return;
      }
      refetch();
    },
    [refetch],
  );

  const confirmDelete = useCallback(
    (task: TaskDetail) => {
      setMenuTask(null);
      Alert.alert('Xoá task', `Xoá "${task.title}"? Hành động này không thể hoàn tác.`, [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: async () => {
            try {
              await tasksApi.remove(task.taskId);
            } catch (err) {
              Alert.alert('Không xoá được', err instanceof ApiError ? err.message : 'Đã xảy ra lỗi.');
              return;
            }
            refetch();
          },
        },
      ]);
    },
    [refetch],
  );

  const currentTasks = byStatus[COLUMNS[activeColumn].id];

  const renderBody = () => {
    if (isLoadingProjects || (isLoading && activeProjectId !== null)) {
      return <LoadingState label="Đang tải bảng công việc…" />;
    }
    if (activeProjectId === null) {
      return <EmptyState message="Bạn chưa thuộc dự án nào." />;
    }
    if (error) return <ErrorState error={error} onRetry={refetch} />;
    if (currentTasks.length === 0) {
      return <EmptyState message={`Không có task nào ở "${COLUMNS[activeColumn].title}".`} />;
    }
    return null;
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <ProjectPicker />
        <Text style={s.title}>Kanban Board</Text>
      </View>

      {/* Column selector pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillScroll} contentContainerStyle={s.pillContent}>
        {COLUMNS.map((col, i) => {
          const isActive = i === activeColumn;
          return (
            <TouchableOpacity
              key={col.id}
              onPress={() => setActiveColumn(i)}
              style={[s.pill, { backgroundColor: isActive ? colors.blue : colors.cardAlt, borderColor: isActive ? 'transparent' : colors.border }]}
            >
              <Text style={[s.pillText, { color: isActive ? '#fff' : colors.muted }]}>{col.title}</Text>
              <View style={[s.pillCount, { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)' }]}>
                <Text style={[s.pillCountText, { color: isActive ? '#fff' : colors.muted }]}>{byStatus[col.id].length}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Task cards */}
      <ScrollView
        style={s.taskScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refetch} tintColor={colors.blue} />
        }
        {...panResponder.panHandlers}
      >
        <View style={s.taskList}>
          {activeProjectId !== null && (
            <TouchableOpacity style={s.addBtn} onPress={() => setIsCreating(true)}>
              <Plus size={16} color={colors.muted} />
              <Text style={[s.mutedSm, { marginLeft: 8 }]}>Thêm task</Text>
            </TouchableOpacity>
          )}

          {renderBody()}

          {currentTasks.map((task, index) => {
            const pCfg = priorityStyle(task.priority);
            const assignee = primaryAssignee(task);
            const risk = riskPercent(task.riskLevel);
            return (
              <FadeSlide key={task.taskId} delay={index * 60}>
                <TouchableOpacity
                  style={s.taskCard}
                  onPress={() => navigation.navigate('TaskDetail', { taskId: task.taskId })}
                  activeOpacity={0.8}
                >
                  <View style={[s.stripe, { backgroundColor: pCfg.stripe }]} />
                  <View style={{ flex: 1, padding: 16 }}>
                    {/* Title row */}
                    <View style={[s.row, { marginBottom: 12 }]}>
                      <Text style={[s.cardLabel, { flex: 1 }]} numberOfLines={2}>{task.title}</Text>
                      <TouchableOpacity onPress={() => setMenuTask(task)} hitSlop={8}>
                        <MoreVertical size={16} color={colors.muted} />
                      </TouchableOpacity>
                    </View>

                    {/* Badges */}
                    <View style={[s.wrap, { marginBottom: 12 }]}>
                      <View style={s.tagBadge}>
                        <Text style={s.tagText}>{statusLabel(task.status)}</Text>
                      </View>
                      <View style={[s.tagBadge, { backgroundColor: pCfg.badgeBg }]}>
                        <Text style={[s.tagText, { color: pCfg.badgeColor }]}>{task.priority ?? 'Medium'}</Text>
                      </View>
                      {task.progress !== null && (
                        <View style={s.tagBadge}>
                          <Text style={s.tagText}>{task.progress}%</Text>
                        </View>
                      )}
                    </View>

                    {/* Risk warning */}
                    {risk >= 55 && (
                      <View style={[s.riskBox, { marginBottom: 12 }]}>
                        <AlertTriangle size={14} color={colors.red} />
                        <Text style={s.riskText}>AI: rủi ro {task.riskLevel}</Text>
                      </View>
                    )}

                    {/* Footer */}
                    <View style={[s.row, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12, marginBottom: 0 }]}>
                      {assignee ? (
                        <View style={s.row}>
                          <LinearGradient colors={gradientFor(assignee.userName)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatarXs}>
                            <Text style={s.avatarXsText}>{getInitials(assignee.userName)}</Text>
                          </LinearGradient>
                          <Text style={[s.mutedXs, { marginLeft: 6 }]}>{assignee.userName}</Text>
                        </View>
                      ) : (
                        <Text style={s.mutedXs}>Chưa giao</Text>
                      )}
                      <View style={s.row}>
                        <Clock size={12} color={colors.muted} strokeWidth={1.75} />
                        <Text style={[s.mutedXs, { marginLeft: 4 }]}>{formatDeadline(task.deadline)}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </FadeSlide>
            );
          })}
        </View>
      </ScrollView>

      {/* Per-task action sheet */}
      <Modal transparent visible={menuTask !== null} animationType="fade" onRequestClose={() => setMenuTask(null)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setMenuTask(null)}>
          <View style={s.menuSheet}>
            <Text style={s.menuTitle} numberOfLines={1}>{menuTask?.title}</Text>
            {COLUMNS.filter(c => c.id !== menuTask?.status).map(col => (
              <TouchableOpacity
                key={col.id}
                style={s.menuItem}
                onPress={() => menuTask && moveTo(menuTask, col.id)}
              >
                <Text style={s.menuItemText}>Chuyển sang “{col.title}”</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={s.menuItem}
              onPress={() => menuTask && confirmDelete(menuTask)}
            >
              <Trash2 size={14} color={colors.red} />
              <Text style={[s.menuItemText, { color: colors.red }]}>Xoá task</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {activeProjectId !== null && (
        <CreateTaskModal
          projectId={activeProjectId}
          visible={isCreating}
          onClose={() => setIsCreating(false)}
          onCreated={refetch}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.bg },
  header:        { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  title:         { fontSize: 26, fontWeight: '700', color: colors.foreground },
  pillScroll:    { flexGrow: 0, marginBottom: 4 },
  pillContent:   { paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
  pill:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, gap: 6 },
  pillText:      { fontSize: 12, fontWeight: '600' },
  pillCount:     { minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pillCountText: { fontSize: 10, fontWeight: '600' },
  taskScroll:    { flex: 1 },
  taskList:      { paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  addBtn:        { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderStyle: 'dashed', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  taskCard:      { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, flexDirection: 'row', overflow: 'hidden' },
  stripe:        { width: 3 },
  row:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 },
  wrap:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cardLabel:     { fontSize: 13, fontWeight: '600', color: colors.foreground, lineHeight: 18 },
  tagBadge:      { backgroundColor: 'rgba(41,98,255,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tagText:       { fontSize: 10, fontWeight: '500', color: '#60A5FA' },
  riskBox:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  riskText:      { fontSize: 11, color: '#FCA5A5' },
  avatarXs:      { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarXsText:  { color: '#fff', fontSize: 9, fontWeight: '700' },
  mutedSm:       { fontSize: 13, color: colors.muted },
  mutedXs:       { fontSize: 11, color: colors.muted },
  backdrop:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', padding: 20 },
  menuSheet:     { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 8, marginBottom: 24 },
  menuTitle:     { fontSize: 13, fontWeight: '700', color: colors.foreground, padding: 12 },
  menuItem:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 14, borderRadius: 12 },
  menuItemText:  { fontSize: 14, color: colors.foreground },
});
