import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  Animated, StyleSheet, RefreshControl, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User, Lock, LogOut, ChevronRight, Award, X,
} from 'lucide-react-native';
import { colors } from '../theme';
import { ApiError, scoresApi, tasksApi, usersApi, type TaskDetail, type UserProfile } from '../api';
import { useApiQuery, useRefetchOnFocus } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectContext';
import { ErrorState } from '../components/StateViews';
import { gradientFor, getInitials } from '../utils/avatar';

function FadeIn({ children, delay }: { children: React.ReactNode; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { projects } = useProjects();
  const userId = session?.userId;

  const [editingName, setEditingName] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  const profileQuery = useApiQuery<UserProfile>(
    signal => usersApi.getById(userId!, signal),
    [userId],
    { enabled: userId !== undefined },
  );
  useRefetchOnFocus(profileQuery.refetch, userId !== undefined);

  const tasksQuery = useApiQuery<TaskDetail[]>(signal => tasksApi.getMine(signal), []);

  const scoreQuery = useApiQuery(
    signal => scoresApi.getUserSummary(userId!, signal),
    [userId],
    { enabled: userId !== undefined },
  );

  const profile = profileQuery.data;
  const displayName = profile?.name ?? session?.name ?? '';
  const email = profile?.email ?? session?.email ?? '';

  const completedCount = useMemo(
    () => (tasksQuery.data ?? []).filter(t => t.status === 'Done').length,
    [tasksQuery.data],
  );

  const memberSince = useMemo(() => {
    if (!profile?.createdAt) return null;
    const date = new Date(profile.createdAt);
    return Number.isNaN(date.getTime())
      ? null
      : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, [profile?.createdAt]);

  const saveName = useCallback(async () => {
    const next = (editingName ?? '').trim();
    if (!userId || next.length === 0) return;
    setIsSavingName(true);
    try {
      await usersApi.updateProfile(userId, { name: next, avatar: profile?.avatar ?? null });
      setEditingName(null);
      profileQuery.refetch();
    } catch (err) {
      Alert.alert('Không lưu được', err instanceof ApiError ? err.message : 'Đã xảy ra lỗi.');
    } finally {
      setIsSavingName(false);
    }
  }, [editingName, userId, profile?.avatar, profileQuery]);

  const confirmSignOut = useCallback(() => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => void signOut() },
    ]);
  }, [signOut]);

  const stats = [
    { label: 'Task đã xong', value: String(completedCount) },
    { label: 'Dự án', value: String(projects.length) },
    { label: 'Điểm', value: String(scoreQuery.data?.totalScore ?? 0) },
  ];

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={profileQuery.isRefreshing}
          onRefresh={() => {
            profileQuery.refetch();
            tasksQuery.refetch();
            scoreQuery.refetch();
          }}
          tintColor={colors.blue}
        />
      }
    >
      <Text style={s.subtitle}>Tài khoản</Text>
      <Text style={s.title}>Hồ sơ</Text>

      {profileQuery.error && (
        <ErrorState error={profileQuery.error} onRetry={profileQuery.refetch} />
      )}

      {/* Profile hero */}
      <View style={[s.card, { borderColor: 'rgba(41,98,255,0.2)', backgroundColor: 'rgba(41,98,255,0.08)' }]}>
        <LinearGradient colors={[colors.blue, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.accentLine} />
        <View style={s.profileRow}>
          <LinearGradient colors={gradientFor(displayName)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.bigAvatar}>
            <Text style={s.bigAvatarText}>{getInitials(displayName)}</Text>
          </LinearGradient>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={s.profileName}>{displayName || 'Không rõ'}</Text>
            <Text style={[s.mutedXs, { marginTop: 2 }]}>
              {profile?.role ?? session?.role ?? 'MEMBER'}
              {scoreQuery.data ? ` · ${scoreQuery.data.level}` : ''}
            </Text>
            <Text style={[s.mutedXs, { marginTop: 2, opacity: 0.7 }]}>{email}</Text>
          </View>
        </View>

        {/* Level progress */}
        {scoreQuery.data && (
          <View style={{ marginBottom: 16 }}>
            <View style={s.rowBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Award size={12} color={colors.green} />
                <Text style={s.mutedXs}>{scoreQuery.data.level}</Text>
              </View>
              <Text style={s.mutedXs}>
                +{scoreQuery.data.totalRewardPoints} / −{scoreQuery.data.totalPenaltyPoints}
              </Text>
            </View>
            <View style={s.barTrack}>
              <View
                style={[
                  s.barFill,
                  { width: `${Math.min(100, Math.max(0, scoreQuery.data.progressToNextLevel))}%` },
                ]}
              />
            </View>
          </View>
        )}

        <View style={s.statsRow}>
          {stats.map((stat, i) => (
            <View key={stat.label} style={[s.statItem, i < stats.length - 1 ? { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.07)' } : {}]}>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.mutedXs}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Account actions */}
      <Text style={s.sectionLabel}>Tài khoản</Text>
      <View style={[s.card, { padding: 0, overflow: 'hidden' }]}>
        <FadeIn delay={0}>
          <TouchableOpacity
            style={[s.settingItem, { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }]}
            activeOpacity={0.7}
            onPress={() => setEditingName(displayName)}
          >
            <View style={s.settingIcon}>
              <User size={16} color={colors.muted} strokeWidth={1.75} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.itemLabel}>Đổi tên hiển thị</Text>
              <Text style={s.mutedXs}>Tên hiện tại: {displayName || '—'}</Text>
            </View>
            <ChevronRight size={16} color={colors.muted} style={{ opacity: 0.4 }} />
          </TouchableOpacity>
        </FadeIn>

        <FadeIn delay={40}>
          <TouchableOpacity
            style={s.settingItem}
            activeOpacity={0.7}
            onPress={() => setIsChangingPassword(true)}
          >
            <View style={s.settingIcon}>
              <Lock size={16} color={colors.muted} strokeWidth={1.75} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.itemLabel}>Đổi mật khẩu</Text>
              <Text style={s.mutedXs}>Cập nhật mật khẩu đăng nhập</Text>
            </View>
            <ChevronRight size={16} color={colors.muted} style={{ opacity: 0.4 }} />
          </TouchableOpacity>
        </FadeIn>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={s.signOutBtn} onPress={confirmSignOut}>
        <LogOut size={16} color={colors.red} strokeWidth={1.75} />
        <Text style={[s.itemLabel, { color: colors.red, marginLeft: 8 }]}>Đăng xuất</Text>
      </TouchableOpacity>

      <Text style={[s.mutedXs, { textAlign: 'center', opacity: 0.4, marginTop: 8, marginBottom: 20 }]}>
        TaskGenie v1.0.0{memberSince ? ` · Tham gia ${memberSince}` : ''}
      </Text>

      <EditNameModal
        value={editingName}
        onChange={setEditingName}
        onCancel={() => setEditingName(null)}
        onSave={saveName}
        isSaving={isSavingName}
      />

      <ChangePasswordModal
        visible={isChangingPassword}
        userId={userId}
        onClose={() => setIsChangingPassword(false)}
      />
    </ScrollView>
  );
}

function EditNameModal({
  value, onChange, onCancel, onSave, isSaving,
}: {
  value: string | null;
  onChange: (next: string) => void;
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <Modal transparent visible={value !== null} animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Đổi tên hiển thị</Text>
            <TouchableOpacity style={s.closeBtn} onPress={onCancel}>
              <X size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20, gap: 12 }}>
            <TextInput
              style={s.input}
              placeholder="Tên hiển thị"
              placeholderTextColor={colors.muted}
              value={value ?? ''}
              onChangeText={onChange}
              editable={!isSaving}
              autoCapitalize="words"
            />
            <TouchableOpacity
              style={[s.primaryBtn, { opacity: (value ?? '').trim() && !isSaving ? 1 : 0.5 }]}
              onPress={onSave}
              disabled={!(value ?? '').trim() || isSaving}
            >
              {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Lưu</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ChangePasswordModal({
  visible, userId, onClose,
}: {
  visible: boolean;
  userId: number | undefined;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!userId) return;
    if (next !== confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await usersApi.changePassword(userId, current, next);
      Alert.alert('Thành công', 'Mật khẩu đã được cập nhật.');
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đã xảy ra lỗi.');
    } finally {
      setIsSaving(false);
    }
  };

  const canSubmit = current.length > 0 && next.length > 0 && confirm.length > 0 && !isSaving;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Đổi mật khẩu</Text>
            <TouchableOpacity style={s.closeBtn} onPress={close}>
              <X size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20, gap: 12 }}>
            <TextInput
              style={s.input}
              placeholder="Mật khẩu hiện tại"
              placeholderTextColor={colors.muted}
              value={current}
              onChangeText={setCurrent}
              secureTextEntry
              editable={!isSaving}
            />
            <TextInput
              style={s.input}
              placeholder="Mật khẩu mới"
              placeholderTextColor={colors.muted}
              value={next}
              onChangeText={setNext}
              secureTextEntry
              editable={!isSaving}
            />
            <TextInput
              style={s.input}
              placeholder="Xác nhận mật khẩu mới"
              placeholderTextColor={colors.muted}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              editable={!isSaving}
            />
            {!!error && <Text style={s.errorText}>{error}</Text>}
            <TouchableOpacity
              style={[s.primaryBtn, { opacity: canSubmit ? 1 : 0.5 }]}
              onPress={submit}
              disabled={!canSubmit}
            >
              {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Cập nhật</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  scroll:       { flex: 1, backgroundColor: colors.bg },
  content:      { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  subtitle:     { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  title:        { fontSize: 26, fontWeight: '700', color: colors.foreground, marginBottom: 20 },
  sectionLabel: { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, marginTop: 4, paddingHorizontal: 4 },
  card:         { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  accentLine:   { height: 2, borderRadius: 1, marginBottom: 16 },
  profileRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  bigAvatar:    { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  bigAvatarText:{ color: '#fff', fontSize: 20, fontWeight: '700' },
  profileName:  { fontSize: 20, fontWeight: '700', color: colors.foreground },
  statsRow:     { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingTop: 16 },
  statItem:     { flex: 1, alignItems: 'center' },
  statValue:    { fontSize: 20, fontWeight: '600', color: colors.foreground, marginBottom: 4 },
  settingItem:  { flexDirection: 'row', alignItems: 'center', padding: 16 },
  settingIcon:  { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  itemLabel:    { fontSize: 14, fontWeight: '500', color: colors.foreground, marginBottom: 2 },
  signOutBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, padding: 16, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', marginBottom: 12, marginTop: 4 },
  mutedXs:      { fontSize: 11, color: colors.muted },
  rowBetween:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  barTrack:     { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 4, backgroundColor: colors.green },
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  sheet:        { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20 },
  sheetHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  sheetTitle:   { fontSize: 16, fontWeight: '700', color: colors.foreground },
  closeBtn:     { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  input:        { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10, fontSize: 14, color: colors.foreground },
  primaryBtn:   { backgroundColor: colors.blue, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  primaryText:  { fontSize: 15, fontWeight: '700', color: '#fff' },
  errorText:    { fontSize: 12, color: '#FCA5A5' },
});
