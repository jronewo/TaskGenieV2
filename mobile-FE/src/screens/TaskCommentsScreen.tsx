import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Send } from 'lucide-react-native';
import { colors, AVATAR_GRADIENTS } from '../theme';
import { useComments } from '../context/CommentsContext';
import { useAuth } from '../context/AuthContext';

export default function TaskCommentsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const taskId: string = route.params?.taskId ?? '1';
  const taskTitle: string = route.params?.taskTitle ?? '';
  const { getComments, addComment } = useComments();
  const { user } = useAuth();
  const [draft, setDraft] = useState('');

  const comments = getComments(taskId);

  const handleSend = () => {
    if (!draft.trim()) return;
    addComment(taskId, draft.trim(), { name: user?.name ?? 'Bạn', initials: user?.initials ?? 'U' });
    setDraft('');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={18} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Bình luận</Text>
          {!!taskTitle && <Text style={s.mutedXs} numberOfLines={1}>{taskTitle}</Text>}
        </View>
      </View>

      <FlatList
        data={comments}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={s.list}
        ListEmptyComponent={<Text style={[s.mutedXs, { textAlign: 'center', marginTop: 40 }]}>Chưa có bình luận nào.</Text>}
        renderItem={({ item }) => (
          <View style={s.commentRow}>
            <LinearGradient colors={AVATAR_GRADIENTS[item.author.initials] ?? [colors.blue, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatarSm}>
              <Text style={s.avatarSmText}>{item.author.initials}</Text>
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={s.row}>
                <Text style={s.authorName}>{item.author.name}</Text>
                <Text style={s.mutedXs}>{item.createdAt}</Text>
              </View>
              <Text style={s.commentText}>{item.content}</Text>
            </View>
          </View>
        )}
      />

      <View style={s.composer}>
        <TextInput
          style={s.input}
          placeholder="Viết bình luận..."
          placeholderTextColor={colors.muted}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <TouchableOpacity style={s.sendBtn} onPress={handleSend} disabled={!draft.trim()}>
          <Send size={16} color={draft.trim() ? '#fff' : colors.muted} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: colors.foreground },
  iconBtn:      { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  list:         { padding: 20, gap: 16, flexGrow: 1 },
  commentRow:   { flexDirection: 'row' },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatarSm:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarSmText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  authorName:   { fontSize: 13, fontWeight: '600', color: colors.foreground },
  commentText:  { fontSize: 13, color: colors.foreground, opacity: 0.85, marginTop: 4, lineHeight: 18 },
  mutedXs:      { fontSize: 11, color: colors.muted },
  composer:     { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  input:        { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.foreground, maxHeight: 100 },
  sendBtn:      { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
});
