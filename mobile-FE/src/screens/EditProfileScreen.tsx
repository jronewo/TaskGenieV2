import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Check } from 'lucide-react-native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [role, setRole] = useState(user?.role ?? '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateUser({ name: name.trim() || user?.name, role: role.trim() || user?.role });
    setSaved(true);
    setTimeout(() => navigation.goBack(), 500);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Chỉnh sửa hồ sơ</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.label}>Họ tên</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholderTextColor={colors.muted} />

        <Text style={s.label}>Vai trò</Text>
        <TextInput style={s.input} value={role} onChangeText={setRole} placeholderTextColor={colors.muted} />

        <Text style={s.label}>Email</Text>
        <View style={[s.input, { opacity: 0.5 }]}>
          <Text style={{ color: colors.foreground, fontSize: 14 }}>{user?.email}</Text>
        </View>

        <TouchableOpacity style={s.submitBtn} onPress={handleSave} activeOpacity={0.85}>
          <Check size={16} color="#fff" />
          <Text style={s.submitBtnText}>{saved ? 'Đã lưu!' : 'Lưu thay đổi'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  iconBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  content:     { paddingHorizontal: 20, paddingBottom: 20 },
  label:       { fontSize: 12, color: colors.muted, marginBottom: 8, marginTop: 16 },
  input:       { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.foreground, justifyContent: 'center' },
  submitBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.blue, borderRadius: 12, paddingVertical: 14, marginTop: 28 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
