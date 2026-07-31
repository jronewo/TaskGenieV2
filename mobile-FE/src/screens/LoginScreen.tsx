import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Sparkles, Eye, EyeOff } from 'lucide-react-native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (e: any) {
      setError(e.message ?? 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={[colors.blue, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.logo}>
          <Sparkles size={28} color="#fff" strokeWidth={1.75} />
        </LinearGradient>
        <Text style={s.appName}>TaskGenie</Text>
        <Text style={s.subtitle}>Đăng nhập để tiếp tục quản lý dự án</Text>

        <View style={s.card}>
          <Text style={s.label}>Email</Text>
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
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
              {showPassword ? <EyeOff size={16} color={colors.muted} /> : <Eye size={16} color={colors.muted} />}
            </TouchableOpacity>
          </View>

          {!!error && <Text style={s.errorText}>{error}</Text>}

          <TouchableOpacity style={s.primaryBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Đăng nhập</Text>}
          </TouchableOpacity>

          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.mutedXs}>hoặc</Text>
            <View style={s.dividerLine} />
          </View>

          <TouchableOpacity style={s.googleBtn} onPress={loginWithGoogle} activeOpacity={0.85}>
            <Text style={s.googleBtnText}>Tiếp tục với Google</Text>
          </TouchableOpacity>
        </View>

        <View style={s.footerRow}>
          <Text style={s.mutedXs}>Chưa có tài khoản? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={s.link}>Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  content:      { flexGrow: 1, backgroundColor: colors.bg, alignItems: 'center', paddingHorizontal: 24, paddingTop: 100, paddingBottom: 40 },
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
  dividerRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  dividerLine:  { flex: 1, height: 1, backgroundColor: colors.border },
  googleBtn:    { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  googleBtnText:{ color: colors.foreground, fontSize: 14, fontWeight: '600' },
  footerRow:    { flexDirection: 'row', marginTop: 24 },
  link:         { fontSize: 12, color: colors.blue, fontWeight: '600' },
  mutedXs:      { fontSize: 12, color: colors.muted },
});
