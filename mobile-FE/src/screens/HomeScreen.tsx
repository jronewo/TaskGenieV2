import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AlertTriangle, ChevronRight, FolderKanban, ListTodo } from 'lucide-react-native';
import { projectApi, ProjectDto, taskApi, TaskDto } from '../api';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme';

const RISK_COLOR: Record<string, string> = {
  CRITICAL: colors.red,
  HIGH: colors.red,
  MEDIUM: colors.yellow,
  LOW: colors.green,
};

const STATUS_LABEL: Record<string, string> = {
  Todo: 'Cần làm',
  InProgress: 'Đang làm',
  InReview: 'Chờ duyệt',
  Done: 'Xong',
};

/** Deadline first, then the riskiest — the order someone picks work in. */
function byUrgency(a: TaskDto, b: TaskDto): number {
  const rank = (t: TaskDto) => (t.riskLevel ?? 'LOW').toUpperCase();
  const weight: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  if (a.deadline && b.deadline && a.deadline !== b.deadline) return a.deadline < b.deadline ? -1 : 1;
  if (a.deadline && !b.deadline) return -1;
  if (!a.deadline && b.deadline) return 1;
  return (weight[rank(a)] ?? 3) - (weight[rank(b)] ?? 3);
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [myTasks, myProjects] = await Promise.all([taskApi.mine(), projectApi.mine()]);
      setTasks(Array.isArray(myTasks) ? myTasks : []);
      setProjects(Array.isArray(myProjects) ? myProjects : []);
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được dữ liệu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetch whenever the tab regains focus: a task completed on another screen must not linger.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const open = tasks.filter((t) => t.status !== 'Done').sort(byUrgency);
  const doneCount = tasks.length - open.length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  return (
    // Tabs hide the header, so the safe area is the only thing keeping content clear of the
    // status bar and the camera cut-out.
    <SafeAreaView style={styles.root} edges={['top']}>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); void load(); }}
          tintColor={colors.blue}
        />
      }
    >
      <Text style={styles.hello}>Chào {user?.name ?? 'bạn'}</Text>
      <Text style={styles.subtitle}>
        {open.length} việc cần làm · {doneCount} đã xong
      </Text>

      {error && (
        <View style={styles.errorBox}>
          <AlertTriangle size={14} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <ListTodo size={15} color={colors.blue} />
        <Text style={styles.sectionTitle}>Việc của tôi</Text>
      </View>

      {open.length === 0 ? (
        <Text style={styles.empty}>Bạn không còn việc nào đang mở.</Text>
      ) : (
        open.map((task) => {
          const risk = (task.riskLevel ?? 'LOW').toUpperCase();
          return (
            <Pressable
              key={task.taskId}
              style={styles.taskCard}
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.taskId })}
            >
              <View style={styles.taskTop}>
                <Text style={styles.taskTitle} numberOfLines={2}>
                  {task.title ?? 'Không tên'}
                </Text>
                <View style={[styles.riskChip, { backgroundColor: `${RISK_COLOR[risk] ?? colors.green}22` }]}>
                  <Text style={[styles.riskText, { color: RISK_COLOR[risk] ?? colors.green }]}>{risk}</Text>
                </View>
              </View>
              <View style={styles.taskMeta}>
                {task.taskTypeName && (
                  <View style={[styles.typeChip, { backgroundColor: task.taskTypeColor ?? colors.muted }]}>
                    <Text style={styles.typeText}>{task.taskTypeName}</Text>
                  </View>
                )}
                <Text style={styles.metaText}>{STATUS_LABEL[task.status ?? 'Todo'] ?? task.status}</Text>
                {task.deadline && <Text style={styles.metaText}>· hạn {task.deadline}</Text>}
              </View>
            </Pressable>
          );
        })
      )}

      <View style={[styles.sectionHeader, { marginTop: 22 }]}>
        <FolderKanban size={15} color={colors.purpleLight} />
        <Text style={styles.sectionTitle}>Dự án</Text>
      </View>

      {projects.length === 0 ? (
        <Text style={styles.empty}>Bạn chưa tham gia dự án nào.</Text>
      ) : (
        projects.map((project) => (
          <Pressable
            key={project.projectId}
            style={styles.projectRow}
            onPress={() =>
              navigation.navigate('ProjectTasks', {
                projectId: project.projectId,
                projectName: project.name,
              })
            }
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.projectName} numberOfLines={1}>
                {project.name}
              </Text>
              <Text style={styles.metaText}>
                {project.organizationName ? `${project.organizationName} · ` : 'Cá nhân · '}
                {project.progress ?? 0}%
              </Text>
            </View>
            <ChevronRight size={18} color={colors.muted} />
          </Pressable>
        ))
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 120 },
  hello: { color: colors.foreground, fontSize: 20, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 2, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  sectionTitle: { color: colors.foreground, fontSize: 13, fontWeight: '700' },
  empty: { color: colors.muted, fontSize: 12, paddingVertical: 14, textAlign: 'center' },
  taskCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  taskTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  taskTitle: { color: colors.foreground, fontSize: 14, fontWeight: '600', flex: 1 },
  riskChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  riskText: { fontSize: 9, fontWeight: '800' },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  typeChip: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  typeText: { color: colors.white, fontSize: 9, fontWeight: '700' },
  metaText: { color: colors.muted, fontSize: 11 },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  projectName: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
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
