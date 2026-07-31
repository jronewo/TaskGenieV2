import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { X, AlertTriangle } from 'lucide-react-native';
import { colors } from '../theme';
import { tasksApi } from '../api';
import { useApiMutation } from '../hooks/useApi';
import { priorityStyle } from '../utils/task';

const PRIORITIES = ['High', 'Medium', 'Low'] as const;
const DEADLINE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface Props {
  projectId: number;
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTaskModal({ projectId, visible, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('Medium');
  const [deadline, setDeadline] = useState('');

  const { mutate, isPending, error, reset } = useApiMutation(tasksApi.create);

  const deadlineIsValid = deadline.length === 0 || DEADLINE_PATTERN.test(deadline);
  const canSubmit = title.trim().length > 0 && deadlineIsValid && !isPending;

  const close = () => {
    setTitle('');
    setDescription('');
    setPriority('Medium');
    setDeadline('');
    reset();
    onClose();
  };

  const submit = async () => {
    if (!canSubmit) return;
    const created = await mutate({
      projectId,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      deadline: deadline || null,
    });
    if (created) {
      onCreated();
      close();
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        style={s.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.headerTitle}>Task mới</Text>
            <TouchableOpacity style={s.closeBtn} onPress={close}>
              <X size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>Tiêu đề *</Text>
            <TextInput
              style={s.input}
              placeholder="Ví dụ: Tối ưu truy vấn báo cáo"
              placeholderTextColor={colors.muted}
              value={title}
              onChangeText={setTitle}
              editable={!isPending}
            />

            <Text style={s.label}>Mô tả</Text>
            <TextInput
              style={[s.input, s.multiline]}
              placeholder="Mô tả ngắn về công việc"
              placeholderTextColor={colors.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              editable={!isPending}
            />

            <Text style={s.label}>Độ ưu tiên</Text>
            <View style={s.priorityRow}>
              {PRIORITIES.map(p => {
                const cfg = priorityStyle(p);
                const isActive = priority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      s.priorityPill,
                      {
                        backgroundColor: isActive ? cfg.badgeBg : 'rgba(255,255,255,0.04)',
                        borderColor: isActive ? cfg.badgeColor : colors.border,
                      },
                    ]}
                    onPress={() => setPriority(p)}
                    disabled={isPending}
                  >
                    <Text style={[s.priorityText, { color: isActive ? cfg.badgeColor : colors.muted }]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.label}>Deadline (YYYY-MM-DD)</Text>
            <TextInput
              style={[s.input, !deadlineIsValid && { borderColor: 'rgba(239,68,68,0.5)' }]}
              placeholder="2026-08-15"
              placeholderTextColor={colors.muted}
              value={deadline}
              onChangeText={setDeadline}
              autoCapitalize="none"
              editable={!isPending}
            />
            {!deadlineIsValid && <Text style={s.hintError}>Định dạng phải là YYYY-MM-DD.</Text>}

            {error && (
              <View style={s.errorBox}>
                <AlertTriangle size={14} color={colors.red} strokeWidth={1.75} />
                <Text style={s.errorText}>{error.message}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.submitBtn, { opacity: canSubmit ? 1 : 0.5 }]}
              onPress={submit}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitText}>Tạo task</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  sheet: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: 20, gap: 8 },
  label: { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 14,
    color: colors.foreground,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityPill: {
    flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center',
  },
  priorityText: { fontSize: 12, fontWeight: '600' },
  hintError: { fontSize: 11, color: '#FCA5A5' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8,
  },
  errorText: { flex: 1, fontSize: 12, color: '#FCA5A5', lineHeight: 16 },
  submitBtn: {
    backgroundColor: colors.blue, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 16,
  },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
