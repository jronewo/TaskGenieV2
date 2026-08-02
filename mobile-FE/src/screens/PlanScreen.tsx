import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { AlertTriangle, Check, CreditCard, ShieldCheck } from 'lucide-react-native';
import { billingApi, EntitlementDto, PaymentDto, PlanDto, SubscriptionDto } from '../api';
import { colors } from '../theme';

function money(minor: number, currency = 'VND'): string {
  // Amounts are stored in integer minor units; dividing in the UI keeps the API free of floats.
  const major = minor / 100;
  return `${major.toLocaleString('vi-VN')} ${currency}`;
}

export default function PlanScreen() {
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [entitlement, setEntitlement] = useState<EntitlementDto | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [payments, setPayments] = useState<PaymentDto[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [planRows, ent, sub, pays] = await Promise.all([
        billingApi.plans('PERSONAL').catch(() => []),
        billingApi.entitlement().catch(() => null),
        billingApi.subscription().catch(() => null),
        billingApi.payments().catch(() => []),
      ]);
      setPlans(Array.isArray(planRows) ? planRows : []);
      setEntitlement(ent);
      setSubscription(sub);
      setPayments(Array.isArray(pays) ? pays.slice(0, 5) : []);
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được thông tin gói.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  /**
   * Starts a checkout and, while a simulated gateway is in use, settles it immediately so the
   * subscription and entitlement update end to end. When a real gateway is wired in it confirms
   * through the payment webhook instead and this second call simply stops being available.
   */
  const subscribe = async (plan: PlanDto) => {
    if (busy) return;
    setBusy(`plan-${plan.planId}`);
    setError(null);
    setNotice(null);
    try {
      const checkout = await billingApi.checkout(plan.planId, null, `mobile-${plan.planId}-${Date.now()}`);
      const paymentId = checkout?.paymentTransactionId ?? checkout?.paymentId;

      if (checkout?.isTestProvider && paymentId) {
        await billingApi.simulate(paymentId, 'SUCCEEDED');
        setNotice(`Đã kích hoạt gói ${plan.name}.`);
      } else {
        setNotice('Đã tạo yêu cầu thanh toán. Hoàn tất trên cổng thanh toán để kích hoạt.');
      }
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Không tạo được thanh toán.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.blue} /></View>;
  }

  const currentPlanCode = entitlement?.planCode;

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
      <Text style={styles.title}>Gói dịch vụ</Text>

      {error && (
        <View style={styles.errorBox}>
          <AlertTriangle size={14} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {notice && <Text style={styles.notice}>{notice}</Text>}

      <View style={styles.currentCard}>
        <View style={styles.currentHead}>
          <ShieldCheck size={16} color={entitlement?.isPremium ? colors.green : colors.muted} />
          <Text style={styles.currentPlan}>{entitlement?.planName ?? 'Free'}</Text>
        </View>
        <Text style={styles.metaText}>
          Dự án: {entitlement?.projectUsage ?? 0}
          {entitlement?.projectLimit != null ? ` / ${entitlement.projectLimit}` : ' / không giới hạn'}
        </Text>
        {subscription?.currentPeriodEnd && (
          <Text style={styles.metaText}>
            Hết hạn {String(subscription.currentPeriodEnd).slice(0, 10)}
          </Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Nâng cấp</Text>
      {plans.length === 0 && <Text style={styles.empty}>Chưa có gói nào được cấu hình.</Text>}

      {plans.map((plan) => {
        const active = plan.code === currentPlanCode;
        return (
          <View key={plan.planId} style={[styles.planCard, active && styles.planCardActive]}>
            <View style={styles.planHead}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planPrice}>{money(plan.priceMinor ?? 0, plan.currency ?? 'VND')}</Text>
            </View>
            {plan.projectLimit != null && (
              <Text style={styles.metaText}>Tối đa {plan.projectLimit} dự án</Text>
            )}
            {plan.description ? <Text style={styles.metaText}>{plan.description}</Text> : null}

            {active ? (
              <View style={styles.activeRow}>
                <Check size={13} color={colors.green} />
                <Text style={styles.activeText}>Đang dùng</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => subscribe(plan)}
                disabled={busy === `plan-${plan.planId}`}
                style={styles.subscribeButton}
              >
                {busy === `plan-${plan.planId}`
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <CreditCard size={13} color={colors.white} />}
                <Text style={styles.subscribeText}>Đăng ký</Text>
              </Pressable>
            )}
          </View>
        );
      })}

      {payments.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
          {payments.map((p) => (
            <View key={p.paymentTransactionId} style={styles.paymentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentAmount}>{money(p.amountMinor ?? 0, p.currency ?? 'VND')}</Text>
                <Text style={styles.metaText}>{String(p.createdAt ?? '').slice(0, 10)}</Text>
              </View>
              <Text
                style={[
                  styles.paymentStatus,
                  { color: p.status === 'SUCCEEDED' ? colors.green : colors.muted },
                ]}
              >
                {p.status}
              </Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 120 },
  title: { color: colors.foreground, fontSize: 20, fontWeight: '700', marginBottom: 14 },
  sectionTitle: { color: colors.foreground, fontSize: 13, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  currentCard: {
    backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    borderRadius: 12, padding: 14, gap: 4,
  },
  currentHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  currentPlan: { color: colors.foreground, fontSize: 16, fontWeight: '700' },
  planCard: {
    backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    borderRadius: 12, padding: 14, marginBottom: 9, gap: 4,
  },
  planCardActive: { borderColor: colors.green },
  planHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { color: colors.foreground, fontSize: 15, fontWeight: '700' },
  planPrice: { color: colors.blue, fontSize: 14, fontWeight: '700' },
  subscribeButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: colors.blue, borderRadius: 10, paddingVertical: 11, marginTop: 8,
  },
  subscribeText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  activeText: { color: colors.green, fontSize: 12, fontWeight: '600' },
  paymentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    borderRadius: 11, padding: 12, marginBottom: 7,
  },
  paymentAmount: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
  paymentStatus: { fontSize: 11, fontWeight: '700' },
  metaText: { color: colors.muted, fontSize: 11 },
  empty: { color: colors.muted, fontSize: 12, paddingVertical: 12 },
  notice: { color: colors.green, fontSize: 12, marginBottom: 10 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.35)',
    borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12,
  },
  errorText: { color: colors.red, flex: 1, fontSize: 12 },
});
