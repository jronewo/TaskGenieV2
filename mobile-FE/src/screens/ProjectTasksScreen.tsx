import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { AlertTriangle } from 'lucide-react-native';
import { taskApi, TaskDto } from '../api';
import { colors } from '../theme';

const COLUMNS = [
  { status: 'Todo', label: 'Cần làm', accent: colors.muted },
  { status: 'InProgress', label: 'Đang làm', accent: colors.blue },
  { status: 'InReview', label: 'Chờ duyệt', accent: colors.yellow },
  { status: 'Done', label: 'Xong', accent: colors.green },
];

const RISK_COLOR: Record<string, string> = {
  CRITICAL: colors.red,
  HIGH: colors.red,
  MEDIUM: colors.yellow,
  LOW: colors.green,
};

/**
 * A project's tasks, grouped by workflow stage. Vertical sections rather than horizontal columns:
 * a phone has no room for four side-by-side lanes, and swiping sideways to find work is worse than
 * scrolling.
 */
export default function ProjectTasksScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { projectId, projectName } = route.params ?? {};

  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await taskApi.byProject(projectId);
      setTasks(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được công việc.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: projectName ?? 'Dự án' });
  }, [navigation, projectName]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); void load(); }}
          tintColor={colors.blue}
        />
      }
    >
      {error && (
        <View style={styles.errorBox}>
          <AlertTriangle size={14} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {tasks.length === 0 && <Text style={styles.empty}>Dự án này chưa có công việc nào.</Text>}

      {COLUMNS.map((column) => {
        const rows = tasks.filter((t) => (t.status ?? 'Todo') === column.status);
        if (rows.length === 0) return null;
        return (
          <View key={column.status} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.dot, { backgroundColor: column.accent }]} />
              <Text style={styles.sectionTitle}>{column.label}</Text>
              <Text style={styles.count}>{rows.length}</Text>
            </View>

            {rows.map((task) => {
              const risk = (task.riskLevel ?? 'LOW').toUpperCase();
              return (
                <Pressable
                  key={task.taskId}
                  style={styles.card}
                  onPress={() => navigation.navigate('TaskDetail', { taskId: task.taskId })}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {task.title ?? 'Không tên'}
                    </Text>
                    <View style={[styles.riskChip, { backgroundColor: `${RISK_COLOR[risk] ?? colors.green}22` }]}>
                      <Text style={[styles.riskText, { color: RISK_COLOR[risk] ?? colors.green }]}>{risk}</Text>
                    </View>
                  </View>
                  <View style={styles.cardMeta}>
                    {task.taskTypeName && (
                      <View style={[styles.typeChip, { backgroundColor: task.taskTypeColor ?? colors.muted }]}>
                        <Text style={styles.typeText}>{task.taskTypeName}</Text>
                      </View>
                    )}
                    <Text style={styles.metaText}>
                      {task.assignees?.[0]?.userName ?? 'Chưa giao'}
                    </Text>
                    {task.deadline && <Text style={styles.metaText}>· {task.deadline}</Text>}
                  </View>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 120 },
  section: { marginBottom: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { color: colors.foreground, fontSize: 13, fontWeight: '700' },
  count: { color: colors.muted, fontSize: 12 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { color: colors.foreground, fontSize: 14, fontWeight: '600', flex: 1 },
  riskChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  riskText: { fontSize: 9, fontWeight: '800' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  typeChip: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  typeText: { color: colors.white, fontSize: 9, fontWeight: '700' },
  metaText: { color: colors.muted, fontSize: 11 },
  empty: { color: colors.muted, fontSize: 12, textAlign: 'center', paddingVertical: 30 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.35)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { color: colors.red, flex: 1, fontSize: 12 },
});
