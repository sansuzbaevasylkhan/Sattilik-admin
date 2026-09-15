import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, MapPin, Navigation, Clock, CheckCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { getUser } from '@/store/userStore';
import { useTranslation } from '@/hooks/useTranslation';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

interface Order {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  price: number;
  status: string;
  distance: string;
  created_at: string;
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const isDriver = user.role === 'driver';
        const filter = isDriver
          ? `driver_phone=eq.${user.phone}&status=eq.completed`
          : `passenger_phone=eq.${user.phone}&status=eq.completed`;

        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/orders?${filter}&order=created_at.desc&limit=50`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );
        const data = await res.json();
        setOrders(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('kk-KZ', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A1628', '#1A3A5C', '#0D2137']} style={styles.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('menuHistory.headerTitle')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator color="#2563EB" size="large" style={{ marginTop: 60 }} />
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock size={56} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyTitle}>{t('menuHistory.emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>{t('menuHistory.emptySubtitle')}</Text>
          </View>
        ) : (
          orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderCardHeader}>
                <CheckCircle size={16} color="#22C55E" />
                <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                <Text style={styles.orderPrice}>{order.price} ₸</Text>
              </View>
              <View style={styles.routeRow}>
                <MapPin size={14} color="#22C55E" />
                <Text style={styles.routeText} numberOfLines={1}>{order.pickup_address}</Text>
              </View>
              <View style={styles.routeConnectorRow}>
                <View style={styles.routeConnector} />
              </View>
              <View style={styles.routeRow}>
                <Navigation size={14} color="#EF4444" />
                <Text style={styles.routeText} numberOfLines={1}>{order.dropoff_address}</Text>
              </View>
              <View style={styles.orderMeta}>
                <Text style={styles.distanceText}>{order.distance}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { ...StyleSheet.absoluteFillObject },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 20, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: 'rgba(255,255,255,0.4)', marginTop: 16 },
  emptySubtitle: { fontSize: 14, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.25)', marginTop: 6, textAlign: 'center' },
  orderCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  orderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  orderDate: { flex: 1, fontSize: 13, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.5)', marginLeft: 4 },
  orderPrice: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#2563EB' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeConnectorRow: { paddingLeft: 7, marginVertical: 4 },
  routeConnector: { width: 2, height: 16, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 1 },
  routeText: { flex: 1, fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  orderMeta: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  distanceText: { fontSize: 12, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.35)' },
});
