import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Mail, Lock, User, AlertTriangle } from 'lucide-react-native';
import { colors } from '../theme';
import { API_BASE_URL, ApiError } from '../api';
import { useAuth } from '../contexts/AuthContext';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  const isRegister = mode === 'register';
  const canSubmit =
    email.trim().length > 0 && password.length > 0 && (!isRegister || name.trim().length > 0);

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      if (isRegister) await signUp(name, email, password);
      else await signIn(email, password);
      // On success the navigator swaps this screen out — no navigation here.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.');
      setIsSubmitting(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
          {/* Brand */}
          <View style={s.brand}>
            <LinearGradient
              colors={[colors.purple, colors.blue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.logo}
            >
              <Sparkles size={28} color="#fff" strokeWidth={1.75} />
            </LinearGradient>
            <Text style={s.title}>TaskGenie</Text>
            <Text style={s.subtitle}>
              {isRegister ? 'Tạo tài khoản mới' : 'Đăng nhập để tiếp tục'}
            </Text>
          </View>

          {/* Form */}
          <View style={s.card}>
            {isRegister && (
              <View style={s.field}>
                <User size={16} color={colors.muted} strokeWidth={1.75} />
                <TextInput
                  style={s.input}
                  placeholder="Họ và tên"
                  placeholderTextColor={colors.muted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!isSubmitting}
                />
              </View>
            )}

            <View style={s.field}>
              <Mail size={16} color={colors.muted} strokeWidth={1.75} />
              <TextInput
                style={s.input}
                placeholder="Email"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!isSubmitting}
              />
            </View>

            <View style={s.field}>
              <Lock size={16} color={colors.muted} strokeWidth={1.75} />
              <TextInput
                style={s.input}
                placeholder="Mật khẩu"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isSubmitting}
                onSubmitEditing={handleSubmit}
                returnKeyType="go"
              />
            </View>

            {error && (
              <View style={s.errorBox}>
                <AlertTriangle size={14} color={colors.red} strokeWidth={1.75} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              activeOpacity={0.85}
              style={{ opacity: !canSubmit || isSubmitting ? 0.5 : 1 }}
            >
              <LinearGradient
                colors={[colors.blue, colors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.submitBtn}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.submitText}>{isRegister ? 'Đăng ký' : 'Đăng nhập'}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.switchBtn}
              onPress={() => switchMode(isRegister ? 'login' : 'register')}
              disabled={isSubmitting}
            >
              <Text style={s.switchText}>
                {isRegister ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
                <Text style={{ color: colors.blue, fontWeight: '600' }}>
                  {isRegister ? 'Đăng nhập' : 'Đăng ký'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={s.hostText}>API: {API_BASE_URL}</Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  brand: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: colors.foreground, marginTop: 16 },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 8,
  },
  input: { flex: 1, fontSize: 14, color: colors.foreground },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { flex: 1, fontSize: 12, color: '#FCA5A5', lineHeight: 16 },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  switchBtn: { alignItems: 'center', paddingVertical: 4 },
  switchText: { fontSize: 13, color: colors.muted },
  hostText: { fontSize: 10, color: colors.muted, textAlign: 'center', marginTop: 20, opacity: 0.5 },
});
