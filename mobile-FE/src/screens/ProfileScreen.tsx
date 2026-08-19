import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { AlertTriangle, Camera, Check, LogOut, Plus, Save, Trash2, Sparkles } from 'lucide-react-native';
import { MySkillDto, SkillDto, skillApi, userApi } from '../api';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme';

const LEVELS = [1, 2, 3, 4, 5];

export default function ProfileScreen() {
  const { user, refreshUser, signOut } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null);

  const [catalog, setCatalog] = useState<SkillDto[]>([]);
  const [mine, setMine] = useState<MySkillDto[]>([]);
  const [pickSkillId, setPickSkillId] = useState<number | null>(null);
  const [pickLevel, setPickLevel] = useState(3);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [all, own] = await Promise.all([
        skillApi.catalog().catch(() => []),
        skillApi.mine().catch(() => []),
      ]);
      setCatalog(Array.isArray(all) ? all : []);
      setMine(Array.isArray(own) ? own : []);
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được hồ sơ.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      setName(user?.name ?? '');
      setAvatar(user?.avatar ?? null);
    }, [load, user?.name, user?.avatar])
  );

  const run = async (key: string, action: () => Promise<void>, success?: string) => {
    if (busy) return;
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (success) setNotice(success);
    } catch (err: any) {
      setError(err?.message ?? 'Thao tác thất bại.');
    } finally {
      setBusy(null);
    }
  };

  /** Picks from the gallery, uploads to Cloudinary, then stores the returned URL on the profile. */
  const changeAvatar = () =>
    run('avatar', async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Cần quyền truy cập thư viện ảnh.');

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (picked.canceled || !picked.assets?.[0]) return;

      const asset = picked.assets[0];
      const { avatarUrl } = await userApi.uploadAvatar(asset.uri, asset.fileName ?? 'avatar.jpg');
      // Two steps on purpose: the upload returns a URL, saving it is what makes it the avatar.
      await userApi.updateProfile(name.trim() || user?.name || null, avatarUrl);
      setAvatar(avatarUrl);
      await refreshUser();
    }, 'Đã cập nhật ảnh đại diện.');

  const saveName = () =>
    run('name', async () => {
      await userApi.updateProfile(name.trim(), avatar);
      await refreshUser();
    }, 'Đã lưu hồ sơ.');

  const addSkill = () =>
    pickSkillId != null &&
    run('add-skill', async () => {
      await skillApi.add(pickSkillId, pickLevel);
      setPickSkillId(null);
      await load();
    }, 'Đã thêm kỹ năng.');

  const changeLevel = (userSkillId: number, level: number) =>
    run(`level-${userSkillId}`, async () => {
      await skillApi.setLevel(userSkillId, level);
      await load();
    });

  const removeSkill = (skill: MySkillDto) =>
    run(`del-${skill.id}`, async () => {
      await skillApi.remove(skill.id);
      await load();
    }, 'Đã gỡ kỹ năng.');

  const available = catalog.filter((c) => !mine.some((m) => m.skillId === c.skillId));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.blue} /></View>;
  }

  return (
    // Tabs hide the header, so the safe area is the only thing keeping content clear of the
    // status bar and the camera cut-out.
    <SafeAreaView style={styles.root} edges={['top']}>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); void load(); }}
          tintColor={colors.blue}
        />
      }
    >
      <View style={styles.avatarBlock}>
        <Pressable onPress={changeAvatar} disabled={busy === 'avatar'} style={styles.avatarWrap}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>
                {(user?.name ?? 'U').trim().charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            {busy === 'avatar'
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Camera size={14} color={colors.white} />}
          </View>
        </Pressable>
        <Text style={styles.email}>{user?.email ?? ''}</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <AlertTriangle size={14} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {notice && <Text style={styles.notice}>{notice}</Text>}

      <Text style={styles.label}>Họ tên</Text>
      <View style={styles.nameRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Tên hiển thị"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Pressable
          onPress={saveName}
          disabled={!name.trim() || busy === 'name'}
          style={[styles.saveButton, (!name.trim() || busy === 'name') && styles.disabled]}
        >
          {busy === 'name'
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Save size={15} color={colors.white} />}
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Sparkles size={14} color={colors.purpleLight} />
        <Text style={styles.sectionTitle}>Kỹ năng của tôi ({mine.length})</Text>
      </View>
      <Text style={styles.hint}>
        Kỹ năng và mức độ quyết định việc bạn được gợi ý cho task nào.
      </Text>

      {mine.length === 0 && <Text style={styles.empty}>Bạn chưa khai kỹ năng nào.</Text>}

      {mine.map((skill) => (
        <View key={skill.id} style={styles.skillCard}>
          <View style={styles.skillTop}>
            <Text style={styles.skillName}>{skill.skillName ?? 'Không rõ'}</Text>
            <Pressable
              onPress={() => removeSkill(skill)}
              disabled={busy === `del-${skill.id}`}
              style={styles.iconButton}
            >
              <Trash2 size={14} color={colors.red} />
            </Pressable>
          </View>
          <View style={styles.levelRow}>
            {LEVELS.map((lv) => {
              const active = (skill.level ?? 1) === lv;
              return (
                <Pressable
                  key={lv}
                  onPress={() => changeLevel(skill.id, lv)}
                  disabled={active || busy === `level-${skill.id}`}
                  style={[styles.levelChip, active && styles.levelChipActive]}
                >
                  <Text style={[styles.levelText, active && styles.levelTextActive]}>{lv}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <Text style={[styles.label, { marginTop: 18 }]}>Thêm kỹ năng</Text>
      {available.length === 0 ? (
        <Text style={styles.empty}>Bạn đã khai hết kỹ năng trong danh mục.</Text>
      ) : (
        <>
          <View style={styles.chipWrap}>
            {available.map((skill) => {
              const active = pickSkillId === skill.skillId;
              return (
                <Pressable
                  key={skill.skillId}
                  onPress={() => setPickSkillId(active ? null : skill.skillId)}
                  style={[styles.pickChip, active && styles.pickChipActive]}
                >
                  {active && <Check size={11} color={colors.white} />}
                  <Text style={[styles.pickText, active && styles.pickTextActive]}>{skill.skillName}</Text>
                </Pressable>
              );
            })}
          </View>

          {pickSkillId != null && (
            <>
              <View style={styles.levelRow}>
                {LEVELS.map((lv) => (
                  <Pressable
                    key={lv}
                    onPress={() => setPickLevel(lv)}
                    style={[styles.levelChip, pickLevel === lv && styles.levelChipActive]}
                  >
                    <Text style={[styles.levelText, pickLevel === lv && styles.levelTextActive]}>{lv}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={addSkill} disabled={busy === 'add-skill'} style={styles.addButton}>
                {busy === 'add-skill'
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <Plus size={14} color={colors.white} />}
                <Text style={styles.addText}>Thêm vào hồ sơ</Text>
              </Pressable>
            </>
          )}
        </>
      )}

      <Pressable onPress={() => void signOut()} style={styles.signOut}>
        <LogOut size={14} color={colors.red} />
        <Text style={styles.signOutText}>Đăng xuất</Text>
      </Pressable>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 130 },
  avatarBlock: { alignItems: 'center', gap: 8, marginBottom: 18 },
  avatarWrap: { width: 96, height: 96 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: { backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.white, fontSize: 34, fontWeight: '700' },
  cameraBadge: {
    position: 'absolute', right: -2, bottom: -2,
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.blue,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.bg,
  },
  email: { color: colors.muted, fontSize: 12 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  hint: { color: colors.muted, fontSize: 11, marginBottom: 10 },
  nameRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11,
    color: colors.foreground, fontSize: 14,
  },
  saveButton: { backgroundColor: colors.blue, borderRadius: 11, padding: 12 },
  disabled: { opacity: 0.4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 22, marginBottom: 4 },
  sectionTitle: { color: colors.foreground, fontSize: 13, fontWeight: '700' },
  skillCard: {
    backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    borderRadius: 11, padding: 12, marginBottom: 8,
  },
  skillTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skillName: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
  iconButton: { padding: 4 },
  levelRow: { flexDirection: 'row', gap: 6, marginTop: 9 },
  levelChip: {
    width: 36, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1,
  },
  levelChipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  levelText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  levelTextActive: { color: colors.white },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8,
  },
  pickChipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  pickText: { color: colors.foreground, fontSize: 12 },
  pickTextActive: { color: colors.white, fontWeight: '600' },
  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: colors.blue, borderRadius: 11, paddingVertical: 12, marginTop: 10,
  },
  addText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  signOut: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderColor: 'rgba(239,68,68,0.35)', borderWidth: 1,
    borderRadius: 11, paddingVertical: 12, marginTop: 26,
  },
  signOutText: { color: colors.red, fontWeight: '700', fontSize: 13 },
  empty: { color: colors.muted, fontSize: 12, paddingVertical: 10 },
  notice: { color: colors.green, fontSize: 12, marginBottom: 10 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.35)',
    borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12,
  },
  errorText: { color: colors.red, flex: 1, fontSize: 12 },
});
