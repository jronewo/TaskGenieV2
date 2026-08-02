import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Send, Sparkles, ChevronUp } from 'lucide-react-native';
import { assistantApi, projectApi, ProjectDto } from '../api';
import { colors } from '../theme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

/** A few things worth asking, so an empty chat is not a blank prompt. */
const SUGGESTIONS = [
  'Task nào của tôi sắp tới hạn?',
  'Việc nào đang có rủi ro cao?',
  'Task nào chưa có ai nhận?',
  'Tổng quan dự án này thế nào?',
];

export default function AssistantScreen() {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [scopeId, setScopeId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      void projectApi
        .mine()
        .then((rows) => setProjects(Array.isArray(rows) ? rows : []))
        .catch(() => setProjects([]));
    }, [])
  );

  const scope = projects.find((p) => p.projectId === scopeId) ?? null;

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;

    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'user', text: question }]);
    setDraft('');
    setBusy(true);
    try {
      const reply = await assistantApi.ask(question, scopeId);
      setMessages((m) => [
        ...m,
        { id: `a-${Date.now()}`, role: 'assistant', text: reply?.answer ?? 'Tôi chưa có câu trả lời cho câu này.' },
      ]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { id: `e-${Date.now()}`, role: 'assistant', text: err?.message ?? 'Không gọi được trợ lý.' },
      ]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.messages}>
        {messages.length === 0 && (
          <View style={styles.intro}>
            <Sparkles size={26} color={colors.purpleLight} />
            <Text style={styles.introTitle}>Trợ lý TaskGenie</Text>
            <Text style={styles.introText}>
              Hỏi về công việc, rủi ro và tiến độ. Trợ lý chỉ đọc được dữ liệu bạn có quyền xem.
            </Text>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} style={styles.suggestion} onPress={() => void send(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {messages.map((m) => (
          <View
            key={m.id}
            style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}
          >
            <Text style={m.role === 'user' ? styles.bubbleUserText : styles.bubbleAssistantText}>
              {m.text}
            </Text>
          </View>
        ))}

        {busy && (
          <View style={[styles.bubble, styles.bubbleAssistant]}>
            <ActivityIndicator color={colors.purpleLight} size="small" />
          </View>
        )}
      </ScrollView>

      {/* Scope lives beside the composer, not at the top: on a phone the top strip collides with
          the camera cut-out, and the scope matters at the moment you type, not before. */}
      {pickerOpen && (
        <View style={styles.picker}>
          <Pressable style={styles.pickerRow} onPress={() => { setScopeId(null); setPickerOpen(false); }}>
            <Text style={styles.pickerText}>Toàn bộ công việc của tôi</Text>
          </Pressable>
          {projects.map((p) => (
            <Pressable
              key={p.projectId}
              style={styles.pickerRow}
              onPress={() => { setScopeId(p.projectId); setPickerOpen(false); }}
            >
              <Text style={styles.pickerText} numberOfLines={1}>{p.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable style={styles.scopeBar} onPress={() => setPickerOpen((v) => !v)}>
        <Sparkles size={13} color={colors.purpleLight} />
        <Text style={styles.scopeText} numberOfLines={1}>
          {scope ? scope.name : 'Toàn bộ công việc của tôi'}
        </Text>
        <ChevronUp size={14} color={colors.muted} />
      </Pressable>

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Hỏi trợ lý..."
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
        />
        <Pressable
          onPress={() => void send(draft)}
          disabled={!draft.trim() || busy}
          style={[styles.send, (!draft.trim() || busy) && styles.disabled]}
        >
          <Send size={16} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scopeBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 9,
    borderTopColor: colors.border, borderTopWidth: 1, backgroundColor: colors.card,
  },
  scopeText: { color: colors.foreground, fontSize: 13, fontWeight: '600', flex: 1 },
  picker: {
    backgroundColor: colors.cardAlt, borderTopColor: colors.border, borderTopWidth: 1,
    maxHeight: 220,
  },
  pickerRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomColor: colors.border, borderBottomWidth: 1 },
  pickerText: { color: colors.foreground, fontSize: 13 },
  messages: { padding: 16, paddingBottom: 24, gap: 10 },
  intro: { alignItems: 'center', gap: 8, paddingVertical: 26 },
  introTitle: { color: colors.foreground, fontSize: 16, fontWeight: '700' },
  introText: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 8 },
  suggestion: {
    backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, marginTop: 4,
  },
  suggestionText: { color: colors.foreground, fontSize: 12 },
  bubble: { borderRadius: 14, padding: 12, maxWidth: '88%' },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.blue },
  bubbleAssistant: {
    alignSelf: 'flex-start', backgroundColor: colors.card,
    borderColor: colors.border, borderWidth: 1,
  },
  bubbleUserText: { color: colors.white, fontSize: 13, lineHeight: 19 },
  bubbleAssistantText: { color: colors.foreground, fontSize: 13, lineHeight: 19 },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, borderTopColor: colors.border, borderTopWidth: 1, backgroundColor: colors.card,
  },
  input: {
    flex: 1, backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1,
    borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10,
    color: colors.foreground, fontSize: 13, maxHeight: 110,
  },
  send: { backgroundColor: colors.blue, borderRadius: 11, padding: 12 },
  disabled: { opacity: 0.4 },
});
