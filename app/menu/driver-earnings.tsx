import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Wallet, CreditCard } from 'lucide-react-native';
import { router } from 'expo-router';
import { getUser } from '@/store/userStore';
import { useTranslation } from '@/hooks/useTranslation';
import { notifyLocal } from '@/lib/notifications';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

interface PaidOrder {
  id: string;
  passenger_first_name: string;
  passenger_last_name: string;
  pickup_address: string;
  dropoff_address: string;
  driver_paid_amount: number;
  driver_withdrawn: boolean;
}

export default function DriverEarningsScreen() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<PaidOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [cardLast4, setCardLast4] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const phone = getUser().phone;
    setLoading(true);
    try {
      const [ordersRes, userRes] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/orders?driver_phone=eq.${encodeURIComponent(phone)}&driver_paid=eq.true&order=created_at.desc&select=id,passenger_first_name,passenger_last_name,pickup_address,dropoff_address,driver_paid_amount,driver_withdrawn`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(phone)}&select=card_last4`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        ),
      ]);

      const ordersData = await ordersRes.json();
      const userData = await userRes.json();
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setCardLast4(userData?.[0]?.card_last4 ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pendingTotal = orders
    .filter((o) => !o.driver_withdrawn)
    .reduce((sum, o) => sum + (o.driver_paid_amount || 0), 0);

  const handleWithdraw = async () => {
    if (!cardLast4) {
      Alert.alert(t('menuDriverEarnings.noCardTitle'), t('menuDriverEarnings.noCardMessage'), [
        { text: t('menuDriverEarnings.addCardButton'), onPress: () => router.push('/menu/add-card') },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
      return;
    }
    if (pendingTotal <= 0) return;

    setWithdrawing(true);
    try {
      const phone = getUser().phone;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?driver_phone=eq.${encodeURIComponent(phone)}&driver_paid=eq.true&driver_withdrawn=eq.false`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ driver_withdrawn: true }),
        }
      );

      if (!res.ok) throw new Error('withdraw failed');

      await notifyLocal(t('menuDriverEarnings.successTitle'), t('menuDriverEarnings.successMessage'));
      Alert.alert(t('menuDriverEarnings.successTitle'), t('menuDriverEarnings.successMessage'));
      fetchData();
    } catch {
      Alert.alert(t('menuDriverEarnings.errorTitle'), t('menuDriverEarnings.errorWithdrawFailed'));
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A1628', '#1A3A5C', '#0D2137']} style={StyleSheet.absoluteFillObject} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('menuDriverEarnings.headerTitle')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.balanceCard}>
          <LinearGradient colors={['#1D4ED8', '#2563EB']} style={styles.balanceGradient}>
            <View style={styles.balanceTopRow}>
              <Wallet size={26} color="rgba(255,255,255,0.85)" />
              {cardLast4 ? (
                <View style={styles.cardBadge}>
                  <CreditCard size={14} color="#FFFFFF" />
                  <Text style={styles.cardBadgeText}>···· {cardLast4}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.balanceLabel}>{t('menuDriverEarnings.pendingLabel')}</Text>
            <Text style={styles.balanceAmount}>{pendingTotal} ₸</Text>

            <TouchableOpacity
              style={[styles.withdrawButton, (pendingTotal <= 0 || withdrawing) && styles.withdrawButtonDisabled]}
              onPress={handleWithdraw}
              activeOpacity={0.85}
              disabled={pendingTotal <= 0 || withdrawing}
            >
              {withdrawing ? (
                <ActivityIndicator color="#2563EB" />
              ) : (
                <Text style={styles.withdrawButtonText}>{t('menuDriverEarnings.withdrawButton')}</Text>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {loading ? (
          <ActivityIndicator color="#2563EB" style={{ marginTop: 24 }} />
        ) : orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Wallet size={48} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyTitle}>{t('menuDriverEarnings.emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>{t('menuDriverEarnings.emptySubtitle')}</Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <View style={styles.tripCard}>
                <View style={styles.tripHeaderRow}>
                  <Text style={styles.passengerName}>
                    {item.passenger_first_name} {item.passenger_last_name?.[0] || ''}
                  </Text>
                  <Text style={styles.tripPrice}>{item.driver_paid_amount} ₸</Text>
                </View>
                <Text style={styles.routeText} numberOfLines={1}>
                  {item.pickup_address} → {item.dropoff_address}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    item.driver_withdrawn ? styles.statusBadgeWithdrawn : styles.statusBadgePending,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {item.driver_withdrawn
                      ? t('menuDriverEarnings.statusWithdrawn')
                      : t('menuDriverEarnings.statusPending')}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: { fontSize: 20, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 24 },
  balanceCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 24 },
  balanceGradient: { padding: 24 },
  balanceTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  cardBadgeText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Inter-SemiBold' },
  balanceLabel: { fontSize: 14, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.7)' },
  balanceAmount: { fontSize: 36, fontFamily: 'Inter-Bold', color: '#FFFFFF', marginBottom: 16 },
  withdrawButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  withdrawButtonDisabled: { opacity: 0.5 },
  withdrawButtonText: { color: '#2563EB', fontSize: 15, fontFamily: 'Inter-Bold' },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: 'rgba(255,255,255,0.4)', marginTop: 12 },
  emptySubtitle: { fontSize: 13, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.25)', marginTop: 4, textAlign: 'center' },
  tripCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tripHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  passengerName: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  tripPrice: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#2563EB' },
  routeText: { fontSize: 13, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.5)', marginBottom: 10 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeWithdrawn: { backgroundColor: 'rgba(34,197,94,0.15)' },
  statusBadgePending: { backgroundColor: 'rgba(245,158,11,0.15)' },
  statusBadgeText: { fontSize: 12, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
});
