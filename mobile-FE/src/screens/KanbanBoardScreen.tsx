import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  Animated, StyleSheet, PanResponder, RefreshControl, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, MoreVertical, Clock, AlertTriangle } from 'lucide-react-native';
import { colors, AVATAR_GRADIENTS } from '../theme';
import { useTasks, ColumnId } from '../context/TasksContext';

const PRIORITY_CONFIG = {
  High:   { stripe: colors.red,    badgeBg: 'rgba(239,68,68,0.12)',   badgeColor: colors.red },
  Medium: { stripe: colors.yellow, badgeBg: 'rgba(245,158,11,0.12)',  badgeColor: colors.yellow },
  Low:    { stripe: colors.green,  badgeBg: 'rgba(16,185,129,0.12)',  badgeColor: colors.green },
} as const;

const COLUMN_DEFS: { id: ColumnId; title: string }[] = [
  { id: 'todo',       title: 'To Do' },
  { id: 'inprogress', title: 'In Progress' },
  { id: 'review',     title: 'Review' },
  { id: 'done',       title: 'Done' },
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
  const { tasksByColumn } = useTasks();
  const [activeColumn, setActiveColumn] = useState(0);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 10,
    onPanResponderRelease: (_, g) => {
      if (g.dx < -50 && activeColumn < COLUMN_DEFS.length - 1) setActiveColumn(c => c + 1);
      if (g.dx > 50  && activeColumn > 0)                      setActiveColumn(c => c - 1);
    },
    [refetch],
  );

  const columns = COLUMN_DEFS.map(col => ({ ...col, tasks: tasksByColumn(col.id) }));
  const currentTasks = columns[activeColumn].tasks;

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
                <Text style={[s.pillCountText, { color: isActive ? '#fff' : colors.muted }]}>{col.tasks.length}</Text>
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
          {/* Add task button */}
          <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('CreateTask')}>
            <Plus size={16} color={colors.muted} />
            <Text style={[s.mutedSm, { marginLeft: 8 }]}>Add Task</Text>
          </TouchableOpacity>

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
                      <View style={s.row}>
                        <LinearGradient colors={AVATAR_GRADIENTS[task.assignee.initials] ?? [colors.blue, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatarXs}>
                          <Text style={s.avatarXsText}>{task.assignee.initials}</Text>
                        </LinearGradient>
                        <Text style={[s.mutedXs, { marginLeft: 6 }]}>{task.assignee.name}</Text>
                      </View>
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
