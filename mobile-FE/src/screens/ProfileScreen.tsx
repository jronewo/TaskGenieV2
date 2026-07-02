import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, StyleSheet, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User, Mail, Bell, Shield, Palette, HelpCircle,
  LogOut, ChevronRight, Settings, Sparkles, Globe, Lock,
} from 'lucide-react-native';
import { colors } from '../theme';

const user = {
  name: 'Sarah Chen',
  email: 'sarah@company.com',
  role: 'Senior Engineer · Project Phoenix',
  initials: 'SC',
  since: 'Jan 2024',
};

const stats = [
  { label: 'Completed', value: '127' },
  { label: 'Projects',  value: '5' },
  { label: 'Teammates', value: '12' },
];

const settingsSections = [
  {
    title: 'Account',
    items: [
      { icon: User,     label: 'Profile Settings',    desc: 'Name, photo, and personal info' },
      { icon: Mail,     label: 'Email Preferences',   desc: 'Digest frequency and routing' },
      { icon: Lock,     label: 'Security',             desc: 'Password, 2FA, active sessions' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Bell,     label: 'Notifications',       desc: 'Channels, timing, and filters' },
      { icon: Palette,  label: 'Appearance',           desc: 'Theme, density, and color' },
      { icon: Globe,    label: 'Language & Region',    desc: 'Locale and timezone' },
    ],
  },
  {
    title: 'AI Features',
    items: [
      { icon: Sparkles, label: 'AI Assistant',        desc: 'Suggestions and automation level' },
      { icon: Shield,   label: 'AI Privacy',           desc: 'What data the AI can access' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: HelpCircle, label: 'Help & Documentation', desc: 'Guides, FAQs, and contact' },
      { icon: Settings,   label: 'Advanced Settings',    desc: 'Developer tools and admin' },
    ],
  },
];

function FadeIn({ children, delay }: { children: React.ReactNode; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

export default function ProfileScreen() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.subtitle}>Account</Text>
      <Text style={s.title}>Profile</Text>

      {/* Profile hero */}
      <View style={[s.card, { borderColor: 'rgba(41,98,255,0.2)', backgroundColor: 'rgba(41,98,255,0.08)' }]}>
        <LinearGradient colors={[colors.blue, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.accentLine} />
        <View style={s.profileRow}>
          <View style={{ position: 'relative' }}>
            <LinearGradient colors={['#2962FF', '#00BCD4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.bigAvatar}>
              <Text style={s.bigAvatarText}>{user.initials}</Text>
            </LinearGradient>
            <View style={s.onlineDot} />
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={s.profileName}>{user.name}</Text>
            <Text style={[s.mutedXs, { marginTop: 2 }]}>{user.role}</Text>
            <Text style={[s.mutedXs, { marginTop: 2, opacity: 0.7 }]}>{user.email}</Text>
          </View>
          <TouchableOpacity style={s.iconBtn}>
            <Settings size={16} color={colors.muted} strokeWidth={1.75} />
          </TouchableOpacity>
        </View>
        <View style={s.statsRow}>
          {stats.map((stat, i) => (
            <View key={stat.label} style={[s.statItem, i < stats.length - 1 ? { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.07)' } : {}]}>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.mutedXs}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Dark mode toggle */}
      <View style={[s.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <View>
          <Text style={s.itemLabel}>Dark Mode</Text>
          <Text style={s.mutedXs}>Currently {darkMode ? 'enabled' : 'disabled'}</Text>
        </View>
        <Switch
          value={darkMode}
          onValueChange={setDarkMode}
          trackColor={{ false: 'rgba(93,126,166,0.3)', true: colors.blue }}
          thumbColor="#fff"
        />
      </View>

      {/* Settings sections */}
      {settingsSections.map((section, si) => (
        <View key={si}>
          <Text style={[s.mutedXs, { textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, marginTop: 4, paddingHorizontal: 4 }]}>
            {section.title}
          </Text>
          <View style={[s.card, { padding: 0, overflow: 'hidden' }]}>
            {section.items.map((item, ii) => {
              const Icon = item.icon;
              return (
                <FadeIn key={ii} delay={si * 50 + ii * 30}>
                  <TouchableOpacity
                    style={[s.settingItem, ii < section.items.length - 1 ? { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' } : {}]}
                    activeOpacity={0.7}
                  >
                    <View style={s.settingIcon}>
                      <Icon size={16} color={colors.muted} strokeWidth={1.75} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={s.itemLabel}>{item.label}</Text>
                      <Text style={s.mutedXs}>{item.desc}</Text>
                    </View>
                    <ChevronRight size={16} color={colors.muted} style={{ opacity: 0.4 }} />
                  </TouchableOpacity>
                </FadeIn>
              );
            })}
          </View>
        </View>
      ))}

      {/* Sign out */}
      <TouchableOpacity style={s.signOutBtn}>
        <LogOut size={16} color={colors.red} strokeWidth={1.75} />
        <Text style={[s.itemLabel, { color: colors.red, marginLeft: 8 }]}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={[s.mutedXs, { textAlign: 'center', opacity: 0.4, marginTop: 8, marginBottom: 20 }]}>
        Apex v1.0.0 · Member since {user.since}
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:       { flex: 1, backgroundColor: colors.bg },
  content:      { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  subtitle:     { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  title:        { fontSize: 26, fontWeight: '700', color: colors.foreground, marginBottom: 20 },
  card:         { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  accentLine:   { height: 2, borderRadius: 1, marginBottom: 16 },
  profileRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  bigAvatar:    { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  bigAvatarText:{ color: '#fff', fontSize: 20, fontWeight: '700' },
  onlineDot:    { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.card },
  profileName:  { fontSize: 20, fontWeight: '700', color: colors.foreground },
  statsRow:     { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingTop: 16 },
  statItem:     { flex: 1, alignItems: 'center' },
  statValue:    { fontSize: 20, fontWeight: '600', color: colors.foreground, marginBottom: 4 },
  settingItem:  { flexDirection: 'row', alignItems: 'center', padding: 16 },
  settingIcon:  { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  iconBtn:      { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  itemLabel:    { fontSize: 14, fontWeight: '500', color: colors.foreground, marginBottom: 2 },
  signOutBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, padding: 16, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', marginBottom: 12 },
  mutedXs:      { fontSize: 11, color: colors.muted },
});
