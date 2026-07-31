import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Check, Lock } from 'lucide-react-native';
import { colors } from '../theme';

export default function ChangePasswordScreen() {
  const navigation = useNavigation<any>();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!current || !next || !confirm) {
      setError('Vui lòng nhập đầy đủ các trường.');
      return;
    }
    if (next !== confirm) {
      setError('Mật khẩu mới không khớp.');
      return;
    }
    setError('');
    setSaved(true);
    setTimeout(() => navigation.goBack(), 500);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Đổi mật khẩu</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.label}>Mật khẩu hiện tại</Text>
        <View style={s.inputRow}>
          <Lock size={16} color={colors.muted} strokeWidth={1.75} />
          <TextInput style={s.input} secureTextEntry value={current} onChangeText={setCurrent} placeholderTextColor={colors.muted} />
        </View>

        <Text style={s.label}>Mật khẩu mới</Text>
        <View style={s.inputRow}>
          <Lock size={16} color={colors.muted} strokeWidth={1.75} />
          <TextInput style={s.input} secureTextEntry value={next} onChangeText={setNext} placeholderTextColor={colors.muted} />
        </View>

        <Text style={s.label}>Xác nhận mật khẩu mới</Text>
        <View style={s.inputRow}>
          <Lock size={16} color={colors.muted} strokeWidth={1.75} />
          <TextInput style={s.input} secureTextEntry value={confirm} onChangeText={setConfirm} placeholderTextColor={colors.muted} />
        </View>

        {!!error && <Text style={s.errorText}>{error}</Text>}

        <TouchableOpacity style={s.submitBtn} onPress={handleSave} activeOpacity={0.85}>
          <Check size={16} color="#fff" />
          <Text style={s.submitBtnText}>{saved ? 'Đã cập nhật!' : 'Cập nhật mật khẩu'}</Text>
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
  inputRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  input:       { flex: 1, fontSize: 14, color: colors.foreground },
  errorText:   { fontSize: 12, color: colors.red, marginTop: 16 },
  submitBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.blue, borderRadius: 12, paddingVertical: 14, marginTop: 28 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
