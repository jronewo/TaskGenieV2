import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Sparkles, AlertTriangle } from 'lucide-react-native';
import { useAuth } from '../auth/AuthContext';
import { useGoogleSignIn } from '../auth/useGoogleSignIn';
import { ApiError } from '../api';
import { colors } from '../theme';

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Email hoặc mật khẩu không đúng.';
    if (err.status === 403) return err.message || 'Tài khoản của bạn đang bị khóa.';
    return err.message;
  }
  // The single most common cause on a device: the API host is unreachable from the emulator.
  return 'Không kết nối được máy chủ. Kiểm tra API có đang chạy không.';
}

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const google = useGoogleSignIn();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signIn') await signIn(email.trim(), password);
      else await signUp(name.trim(), email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    email.trim().length > 0 && password.length > 0 && (mode === 'signIn' || name.trim().length > 0);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <Sparkles size={26} color={colors.blue} />
          <Text style={styles.brand}>TaskGenie</Text>
        </View>
        <Text style={styles.tagline}>Công việc của bạn, ngay trên điện thoại.</Text>

        {error && (
          <View style={styles.errorBox}>
            <AlertTriangle size={14} color={colors.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {mode === 'signUp' && (
          <View style={styles.field}>
            <Text style={styles.label}>Họ tên</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nguyễn Văn A"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="ban@congty.com"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>

        <Pressable
          onPress={submit}
          disabled={!canSubmit || busy}
          style={[styles.primary, (!canSubmit || busy) && styles.primaryDisabled]}
        >
          {busy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryText}>{mode === 'signIn' ? 'Đăng nhập' : 'Tạo tài khoản'}</Text>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>hoặc</Text>
          <View style={styles.divider} />
        </View>

        {/* Disabled rather than hidden when unconfigured: a button that opens a browser only to
            fail is worse than one that says why it cannot run. */}
        <Pressable
          onPress={() => void google.signIn()}
          disabled={!google.ready || busy}
          style={[styles.googleButton, !google.ready && styles.primaryDisabled]}
        >
          {google.busy ? (
            <ActivityIndicator color="#1F1F1F" />
          ) : (
            <Text style={styles.googleText}>Đăng nhập bằng Google</Text>
          )}
        </Pressable>
        {google.error && <Text style={styles.googleError}>{google.error}</Text>}
        {!google.configured && (
          <Text style={styles.note}>
            Chưa cấu hình EXPO_PUBLIC_GOOGLE_CLIENT_ID nên đăng nhập Google đang tắt.
          </Text>
        )}

        <Pressable onPress={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setError(null); }}>
          <Text style={styles.switch}>
            {mode === 'signIn' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
          </Text>
        </Pressable>

        {/* Administration is web-only on purpose: the phone app is for doing the work, not
            running the platform. */}
        <Text style={styles.note}>Quản trị hệ thống chỉ có trên bản web.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  brand: { color: colors.foreground, fontSize: 24, fontWeight: '700' },
  tagline: { color: colors.muted, textAlign: 'center', marginBottom: 12, fontSize: 13 },
  field: { gap: 6 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.foreground,
    fontSize: 15,
  },
  primary: {
    backgroundColor: colors.blue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  switch: { color: colors.blue, textAlign: 'center', fontSize: 13, marginTop: 4 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.muted, fontSize: 11 },
  googleButton: {
    backgroundColor: colors.white, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  googleText: { color: '#1F1F1F', fontWeight: '700', fontSize: 14 },
  googleError: { color: colors.red, fontSize: 11, textAlign: 'center' },
  note: { color: colors.muted, textAlign: 'center', fontSize: 11, marginTop: 16 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.35)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  errorText: { color: colors.red, flex: 1, fontSize: 12 },
});
