import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Animated, StyleSheet, Dimensions, Modal,
} from 'react-native';
import { X, UserPlus, Check } from 'lucide-react-native';
import { colors } from '../theme';

const { height: SCREEN_H } = Dimensions.get('window');

interface Props {
  onClose: () => void;
  onInvite: (email: string) => void;
}

export default function InviteMemberSheet({ onClose, onInvite }: Props) {
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, damping: 32, stiffness: 320, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 280, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const handleSend = () => {
    if (!email.trim()) return;
    onInvite(email.trim());
    setSent(true);
    setTimeout(handleClose, 700);
  };

  return (
    <Modal transparent statusBarTranslucent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={s.handleWrap}>
          <View style={s.handle} />
        </View>

        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.headerIcon}>
              <UserPlus size={16} color={colors.blue} strokeWidth={1.75} />
            </View>
            <Text style={s.headerTitle}>Mời thành viên</Text>
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
            <X size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={s.body}>
          <Text style={s.label}>Email người được mời</Text>
          <TextInput
            style={s.input}
            placeholder="teammate@company.com"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TouchableOpacity style={s.sendBtn} onPress={handleSend} activeOpacity={0.85} disabled={!email.trim()}>
            <Check size={16} color="#fff" />
            <Text style={s.sendBtnText}>{sent ? 'Đã gửi lời mời!' : 'Gửi lời mời'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 40 },
  sheet:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', zIndex: 50 },
  handleWrap:  { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon:  { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(41,98,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  closeBtn:    { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  body:        { padding: 20, paddingBottom: 32 },
  label:       { fontSize: 12, color: colors.muted, marginBottom: 8 },
  input:       { backgroundColor: 'rgba(17,30,53,0.8)', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.foreground },
  sendBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.blue, borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
