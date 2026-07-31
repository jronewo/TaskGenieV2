import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Mail, Lock, Sparkles, ArrowLeft } from 'lucide-react-native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }: any) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
    } catch (e: any) {
      setError(e.message ?? 'Đăng ký thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.navigate('Login')}>
          <ArrowLeft size={18} color={colors.foreground} />
        </TouchableOpacity>

        <LinearGradient colors={[colors.purple, colors.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.logo}>
          <Sparkles size={28} color="#fff" strokeWidth={1.75} />
        </LinearGradient>
        <Text style={s.appName}>Tạo tài khoản</Text>
        <Text style={s.subtitle}>Bắt đầu quản lý dự án cùng TaskGenie</Text>

        <View style={s.card}>
          <Text style={s.label}>Họ tên</Text>
          <View style={s.inputRow}>
            <User size={16} color={colors.muted} strokeWidth={1.75} />
            <TextInput
              style={s.input}
              placeholder="Nguyễn Văn A"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <Text style={[s.label, { marginTop: 16 }]}>Email</Text>
          <View style={s.inputRow}>
            <Mail size={16} color={colors.muted} strokeWidth={1.75} />
            <TextInput
              style={s.input}
              placeholder="you@company.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Text style={[s.label, { marginTop: 16 }]}>Mật khẩu</Text>
          <View style={s.inputRow}>
            <Lock size={16} color={colors.muted} strokeWidth={1.75} />
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {!!error && <Text style={s.errorText}>{error}</Text>}

          <TouchableOpacity style={s.primaryBtn} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Đăng ký</Text>}
          </TouchableOpacity>
        </View>

        <View style={s.footerRow}>
          <Text style={s.mutedXs}>Đã có tài khoản? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={s.link}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  content:      { flexGrow: 1, backgroundColor: colors.bg, alignItems: 'center', paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },
  backBtn:      { alignSelf: 'flex-start', width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  logo:         { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  appName:      { fontSize: 24, fontWeight: '700', color: colors.foreground, marginBottom: 6 },
  subtitle:     { fontSize: 13, color: colors.muted, marginBottom: 32, textAlign: 'center' },
  card:         { width: '100%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 20 },
  label:        { fontSize: 12, color: colors.muted, marginBottom: 8 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(17,30,53,0.8)', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  input:        { flex: 1, fontSize: 14, color: colors.foreground },
  errorText:    { fontSize: 12, color: colors.red, marginTop: 12 },
  primaryBtn:   { marginTop: 20, backgroundColor: colors.blue, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  footerRow:    { flexDirection: 'row', marginTop: 24 },
  link:         { fontSize: 12, color: colors.blue, fontWeight: '600' },
  mutedXs:      { fontSize: 12, color: colors.muted },
});
