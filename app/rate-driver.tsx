import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import StarRating from '@/components/StarRating';
import { BG_GRADIENT, BG_DARK, GOLD_GRADIENT } from '@/lib/theme';
import { getUser } from '@/store/userStore';
import { useRatings } from '@/hooks/useRatings';
import { useTranslation } from '@/hooks/useTranslation';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const abbrev = (firstName: string, lastName: string) => {
  const l = lastName?.trim();
  return `${firstName}${l ? ' ' + l[0].toUpperCase() + '.' : ''}`;
};

export default function RateDriverScreen() {
  const params = useLocalSearchParams();
  const orderId = String(params.orderId || '');

  const user = getUser();
  const { submitReview } = useRatings();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<{ phone: string; firstName: string; lastName: string } | null>(null);

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const passengerFirstName = useMemo(() => user.firstName || t('rateDriver.defaultGuestName'), [user.firstName]);
  const passengerLastName = useMemo(() => user.lastName || '', [user.lastName]);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const run = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=driver_phone,driver_first_name,driver_last_name`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );
        const data = await res.json();
        const o = Array.isArray(data) ? data[0] : null;
        if (!o) return;

        setDriver({
          phone: o.driver_phone,
          firstName: o.driver_first_name || '',
          lastName: o.driver_last_name || '',
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [orderId]);

  const driverLabel = useMemo(() => {
    if (!driver) return '';
    return abbrev(driver.firstName, driver.lastName);
  }, [driver]);

  // driver-order.tsx passenger_reviewed=true болғанша "аяқталды" экранында
  // тоқтап қалады — сондықтан баға берсе де, өткізіп жіберсе де осы
  // белгіні қоямыз, әйтпесе жүргізуші жаңа тапсырыстарды ешқашан көрмейді.
  const markOrderReviewed = async () => {
    if (!orderId) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ passenger_reviewed: true }),
      });
    } catch {
      // желі болмаса да пайдаланушыны бұғаттамаймыз
    }
  };

  const handleSkip = async () => {
    await markOrderReviewed();
    router.back();
  };

  const handleSubmit = async () => {
    if (!orderId || !driver?.phone) {
      Alert.alert(t('rateDriver.errorTitle'), t('rateDriver.errorNoOrderOrDriver'));
      return;
    }
    if (stars < 1) {
      Alert.alert(t('rateDriver.warningTitle'), t('rateDriver.warningSelectStars'));
      return;
    }
    if (!comment.trim()) {
      Alert.alert(t('rateDriver.warningTitle'), t('rateDriver.warningWriteComment'));
      return;
    }

    setSubmitting(true);
    try {
      await submitReview({
        orderId,
        driverPhone: driver.phone,
        passengerFirstName,
        passengerLastName,
        stars,
        comment: comment.trim(),
      });
      await markOrderReviewed();
      Alert.alert(t('rateDriver.successTitle'), t('rateDriver.successMessage'), [
        { text: t('rateDriver.okButton'), onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert(t('rateDriver.errorTitle'), e?.message || t('rateDriver.errorSubmitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={BG_DARK} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={BG_GRADIENT}
        style={styles.bg}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <ChevronLeft size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('rateDriver.headerTitle')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.driverCard}>
          <View style={styles.avatarWrap}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.avatarImg}
            />
          </View>
          <Text style={styles.driverName}>{driverLabel}</Text>

          <View style={styles.ratingBlock}>
            <Text style={styles.ratingTitle}>{t('rateDriver.ratingTitle')}</Text>
            <StarRating value={stars} onChange={setStars} />
          </View>

          {stars > 0 && (
            <View style={styles.commentBlock}>
              <Text style={styles.commentLabel}>{t('rateDriver.commentLabel')}</Text>
              <TextInput
                style={styles.textarea}
                value={comment}
                onChangeText={setComment}
                placeholder={t('rateDriver.commentPlaceholder')}
                placeholderTextColor="rgba(255,255,255,0.35)"
                multiline
              />
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, submitting && { opacity: 0.7 }]}
          activeOpacity={0.85}
          disabled={submitting}
          onPress={handleSubmit}
        >
          <LinearGradient
            colors={GOLD_GRADIENT}
            style={styles.primaryButtonGradient}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>{t('rateDriver.submitButton')}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipLink}>{t('rateDriver.skipLink')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'flex-start' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  driverCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: BG_DARK,
    marginBottom: 12,
    alignSelf: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  driverName: { fontSize: 22, fontFamily: 'Inter-Bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 18 },
  ratingBlock: { marginBottom: 12 },
  ratingTitle: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: 'rgba(255,255,255,0.6)', marginBottom: 10 },
  commentBlock: { marginTop: 14 },
  commentLabel: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  textarea: {
    minHeight: 110,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: '#FFFFFF',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  primaryButton: {
    height: 56,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 18,
  },
  primaryButtonGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Inter-Bold' },
  skipLink: { marginTop: 14, textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter-Regular', fontSize: 14 },
});

