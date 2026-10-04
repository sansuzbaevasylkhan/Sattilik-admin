import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, TrendingUp, Calendar, Star } from 'lucide-react-native';
import { router } from 'expo-router';
import { getUser } from '@/store/userStore';
import { useTranslation } from '@/hooks/useTranslation';
import { BG_GRADIENT, BG_DARK, GOLD_PRIMARY } from '@/lib/theme';
import Svg, { Rect, Polyline } from 'react-native-svg';

const { width } = Dimensions.get('window');

type Period = 'day' | 'week' | 'month';

export default function DriverEarningsScreen() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const user = getUser();
      if (!user.phone) return;

      const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/get_driver_stats`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            driver_phone_input: user.phone,
            period_input: period,
          }),
        }
      );

      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();

      setStats(Array.isArray(data) ? data[0] : data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  const renderChart = () => {
    if (!stats?.earnings_history || stats.earnings_history.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>Деректер жоқ</Text>
        </View>
      );
    }

    const history = stats.earnings_history;
    const maxVal = Math.max(...history.map((h: any) => h.value));
    const chartWidth = width - 64;
    const chartHeight = 150;
    const step = chartWidth / (history.length - 1 || 1);

    const points = history.map((h: any, i: number) => {
      const x = i * step;
      const y = chartHeight - (h.value / maxVal) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

    return (
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          <Polyline
            points={points}
            fill="none"
            stroke={GOLD_PRIMARY}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {history.map((h: any, i: number) => (
            <Rect
              key={i}
              x={i * step - 3}
              y={chartHeight - (h.value / maxVal) * chartHeight - 3}
              width="6"
              height="6"
              fill="#FFFFFF"
              rx="3"
            />
          ))}
        </Svg>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={BG_GRADIENT} style={styles.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('menuDriverEarnings.headerTitle') || 'Табыс статистикасы'}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.periodTabs}>
          {(['day', 'week', 'month'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.tab, period === p && styles.tabActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.tabText, period === p && styles.tabTextActive]}>
                {p === 'day' ? 'Күн' : p === 'week' ? 'Апта' : 'Ай'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={GOLD_PRIMARY} style={{ marginTop: 50 }} />
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <TrendingUp size={24} color={GOLD_PRIMARY} />
                <Text style={styles.statLabel}>{t('menuDriverEarnings.totalEarnings') || 'Барлық табыс'}</Text>
                <Text style={styles.statValue}>{stats?.total_earnings?.toLocaleString()} ₸</Text>
              </View>
              <View style={styles.statCard}>
                <Calendar size={24} color={GOLD_PRIMARY} />
                <Text style={styles.statLabel}>{t('menuDriverEarnings.tripCount') || 'Сапар саны'}</Text>
                <Text style={styles.statValue}>{stats?.trip_count || 0}</Text>
              </View>
              <View style={styles.statCard}>
                <Star size={24} color={GOLD_PRIMARY} />
                <Text style={styles.statLabel}>{t('menuDriverEarnings.avgRating') || 'Рейтинг'}</Text>
                <Text style={styles.statValue}>{stats?.avg_rating?.toFixed(1) || '5.0'}</Text>
              </View>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{t('menuDriverEarnings.earningsGraph') || 'Табыс динамикасы'}</Text>
              {renderChart()}
            </View>
          </>
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
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  backBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: GOLD_PRIMARY,
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  tabTextActive: {
    color: BG_DARK,
    fontFamily: 'Inter-Bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 64) / 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chartTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 20,
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 150,
  },
  emptyChart: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter-Regular',
  },
});
