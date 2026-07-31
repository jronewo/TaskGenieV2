import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle, Inbox, WifiOff } from 'lucide-react-native';
import { colors } from '../theme';
import type { ApiError } from '../api';

export function LoadingState({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <View style={s.box}>
      <ActivityIndicator color={colors.blue} />
      <Text style={s.muted}>{label}</Text>
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const Icon = error.isNetworkError ? WifiOff : AlertTriangle;
  return (
    <View style={s.box}>
      <Icon size={32} color={colors.red} strokeWidth={1.5} />
      <Text style={s.errorText}>{error.message}</Text>
      {onRetry && (
        <TouchableOpacity style={s.retryBtn} onPress={onRetry}>
          <Text style={s.retryText}>Thử lại</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={s.box}>
      <Inbox size={32} color={colors.muted} strokeWidth={1.5} />
      <Text style={s.muted}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  muted: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  errorText: { fontSize: 13, color: '#FCA5A5', textAlign: 'center', lineHeight: 18 },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(41,98,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(41,98,255,0.3)',
  },
  retryText: { fontSize: 13, fontWeight: '600', color: '#60A5FA' },
});
