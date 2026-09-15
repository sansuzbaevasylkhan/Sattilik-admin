import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Star, Phone, User } from 'lucide-react-native';
import { router } from 'expo-router';
import { getUser, subscribeUser } from '@/store/userStore';
import { useTranslation } from '@/hooks/useTranslation';
import { BG_GRADIENT, GOLD_MEDIUM_FILL, GOLD_SOFT_BORDER, GOLD_SOFT_FILL, GOLD_PRIMARY, GOLD_DARK } from '@/lib/theme';

const pushAny = (path: string) => router.push(path as any);

export default function ProfileScreen() {
  const { t } = useTranslation();
  const [user, setUser] = useState(getUser());

  useEffect(() => {
    const unsub = subscribeUser(() => setUser(getUser()));
    return unsub;
  }, []);

  useEffect(() => {
    if (user.role !== 'driver') {
      setAvgRating(null);
      setReviewsCount(0);
      return;
    }
    if (!user.phone) return;
    refreshDriverRating(user.phone);
  }, [user.role, user.phone]);


  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || t('menuProfile.defaultUserName');
  const roleLabel = user.role === 'driver' ? t('menuProfile.roleDriver') : t('menuProfile.rolePassenger');

  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewsCount, setReviewsCount] = useState<number>(0);
  const [driverId, setDriverId] = useState<string | null>(null);

  const refreshDriverRating = async (driverPhone: string) => {
    const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(driverPhone)}&select=average_rating,reviews_count,driver_id`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!res.ok) return;
    const rows = (await res.json()) as any[];
    const row = rows?.[0];
    setAvgRating(row?.average_rating ?? null);
    setReviewsCount(row?.reviews_count ?? 0);
    setDriverId(row?.driver_id ?? null);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={BG_GRADIENT} style={styles.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('menuProfile.headerTitle')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.avatarImg}
            />
          </View>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.roleLabel}>{roleLabel}</Text>
          {user.role === 'driver' && (
          <TouchableOpacity
              style={styles.editButton}
              activeOpacity={0.8}
              onPress={() => pushAny('menu/edit-profile')}
            >


              <Text style={styles.editButtonText}>{t('menuProfile.editButton')}</Text>
            </TouchableOpacity>
          )}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => {
              const filled = typeof avgRating === 'number' ? i <= avgRating : false;
              return (
                <Star
                  key={i}
                  size={22}
                  color={filled ? '#EAB308' : 'rgba(255,255,255,0.2)'}
                  fill={filled ? '#F59E0B' : 'rgba(255,255,255,0.1)'}
                />
              );
            })}
          </View>
          <Text style={styles.ratingText}>
            {typeof avgRating === 'number'
              ? `${avgRating.toFixed(1)} • ${reviewsCount} ${t('menuProfile.reviewsSuffix')}`
              : `0 ${t('menuProfile.reviewsSuffix')}`}
          </Text>


        </View>


        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconCircle}>
              <User size={18} color="#FFD700" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('menuProfile.fullNameLabel')}</Text>
              <Text style={styles.infoValue}>{fullName}</Text>
            </View>
          </View>

          <View style={styles.infoRowDivider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconCircle}>
              <Phone size={18} color="#FFD700" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('menuProfile.phoneLabel')}</Text>
              <Text style={styles.infoValue}>
                {user.phone || t('menuProfile.phonePlaceholder')}
              </Text>
            </View>
          </View>

          {user.role === 'driver' && driverId && (
            <>
              <View style={styles.infoRowDivider} />
              <View style={styles.infoRow}>
                <View style={styles.infoIconCircle}>
                  <Text style={{ color: '#FFD700', fontFamily: 'Inter-Bold', fontSize: 14 }}>ID</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('menuProfile.driverIdLabel')}</Text>
                  <Text style={styles.infoValue}>{driverId}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>{t('menuProfile.statsTrips')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0.0</Text>
            <Text style={styles.statLabel}>{t('menuProfile.statsRating')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0 ₸</Text>
            <Text style={styles.statLabel}>{t('menuProfile.statsTotal')}</Text>
          </View>
        </View>
      </View>
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
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  content: { paddingHorizontal: 24 },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFD700',
    marginBottom: 14,
  },
  avatarImg: { width: '100%', height: '100%' },
  name: { fontSize: 22, fontFamily: 'Inter-Bold', color: '#FFFFFF', marginBottom: 4 },
  roleLabel: { fontSize: 14, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.5)', marginBottom: 12 },
  starsRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  ratingText: { fontSize: 13, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.3)' },
  editButton: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,215,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.45)',
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFD700',
  },

  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoRowDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 12 },
  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.4)' },
  infoValue: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#FFFFFF', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: { fontSize: 20, fontFamily: 'Inter-Bold', color: '#FFFFFF', marginBottom: 4 },
  statLabel: { fontSize: 12, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.4)' },
});
