import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';
import { colors, AVATAR_GRADIENTS } from '../theme';
import { useTasks, Priority } from '../context/TasksContext';
import { MOCK_USERS } from '../data/mockUsers';

const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];

const PRIORITY_COLOR: Record<Priority, string> = {
  High: colors.red,
  Medium: colors.yellow,
  Low: colors.green,
};

export default function CreateTaskScreen() {
  const navigation = useNavigation<any>();
  const { addTask } = useTasks();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [assigneeId, setAssigneeId] = useState(MOCK_USERS[0].id);
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề công việc.');
      return;
    }
    const assignee = MOCK_USERS.find(u => u.id === assigneeId)!;
    addTask({
      title: title.trim(),
      description: description.trim() || 'Chưa có mô tả chi tiết.',
      priority,
      dueDate: dueDate.trim() || new Date().toISOString().slice(0, 10),
      assignee: { name: assignee.name, initials: assignee.initials, email: assignee.email },
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
    });
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
          <X size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Tạo công việc mới</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Tiêu đề</Text>
        <TextInput
          style={s.input}
          placeholder="VD: Tối ưu truy vấn database"
          placeholderTextColor={colors.muted}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={s.label}>Mô tả</Text>
        <TextInput
          style={[s.input, s.textArea]}
          placeholder="Mô tả chi tiết công việc..."
          placeholderTextColor={colors.muted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Text style={s.label}>Độ ưu tiên</Text>
        <View style={s.priorityRow}>
          {PRIORITIES.map(p => {
            const active = p === priority;
            return (
              <TouchableOpacity
                key={p}
                style={[s.priorityPill, { borderColor: active ? PRIORITY_COLOR[p] : colors.border, backgroundColor: active ? PRIORITY_COLOR[p] + '20' : 'transparent' }]}
                onPress={() => setPriority(p)}
              >
                <Text style={{ color: active ? PRIORITY_COLOR[p] : colors.muted, fontSize: 12, fontWeight: '600' }}>{p}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.label}>Hạn chót (YYYY-MM-DD)</Text>
        <TextInput
          style={s.input}
          placeholder="2026-06-15"
          placeholderTextColor={colors.muted}
          value={dueDate}
          onChangeText={setDueDate}
        />

        <Text style={s.label}>Tags (phân cách bởi dấu phẩy)</Text>
        <TextInput
          style={s.input}
          placeholder="Backend, Performance"
          placeholderTextColor={colors.muted}
          value={tagsInput}
          onChangeText={setTagsInput}
        />

        <Text style={s.label}>Người phụ trách</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
          {MOCK_USERS.map(u => {
            const active = u.id === assigneeId;
            return (
              <TouchableOpacity key={u.id} style={s.userChip} onPress={() => setAssigneeId(u.id)}>
                <LinearGradient colors={AVATAR_GRADIENTS[u.initials] ?? [colors.blue, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.avatarSm, active && { borderWidth: 2, borderColor: colors.blue }]}>
                  <Text style={s.avatarSmText}>{u.initials}</Text>
                </LinearGradient>
                <Text style={[s.mutedXs, active && { color: colors.foreground, fontWeight: '600' }]} numberOfLines={1}>{u.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {!!error && <Text style={s.errorText}>{error}</Text>}

        <TouchableOpacity style={s.submitBtn} onPress={handleCreate} activeOpacity={0.85}>
          <Check size={16} color="#fff" />
          <Text style={s.submitBtnText}>Tạo công việc</Text>
        </TouchableOpacity>
        <View style={{ height: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: colors.foreground },
  iconBtn:      { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  content:      { paddingHorizontal: 20, paddingBottom: 20 },
  label:        { fontSize: 12, color: colors.muted, marginBottom: 8, marginTop: 16 },
  input:        { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.foreground },
  textArea:     { height: 90, textAlignVertical: 'top' },
  priorityRow:  { flexDirection: 'row', gap: 8 },
  priorityPill: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  userChip:     { alignItems: 'center', width: 64 },
  avatarSm:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  avatarSmText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  errorText:    { fontSize: 12, color: colors.red, marginTop: 16 },
  submitBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.blue, borderRadius: 12, paddingVertical: 14, marginTop: 24 },
  submitBtnText:{ color: '#fff', fontSize: 14, fontWeight: '700' },
  mutedXs:      { fontSize: 10, color: colors.muted, textAlign: 'center' },
});
