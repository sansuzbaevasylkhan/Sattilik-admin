import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Delete } from 'lucide-react-native';
import { router } from 'expo-router';
import { getUser } from '@/store/userStore';
import { useTranslation } from '@/hooks/useTranslation';
import { notifyLocal } from '@/lib/notifications';
import { BG_GRADIENT, GOLD_GRADIENT, GOLD_GRADIENT_DISABLED } from '@/lib/theme';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const DRIVER_ID_LENGTH = 6;

interface MatchedOrder {
  id: string;
  price: number;
  driver_first_name: string;
  driver_last_name: string;
}

export default function PayDriverScreen() {
  const { t } = useTranslation();
  const [driverIdInput, setDriverIdInput] = useState('');
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'notfound'>('idle');
  const [matchedOrder, setMatchedOrder] = useState<MatchedOrder | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (driverIdInput.length < DRIVER_ID_LENGTH) {
      const reset = setTimeout(() => {
        setLookupState('idle');
        setMatchedOrder(null);
      }, 0);
      return () => clearTimeout(reset);
    }

    let cancelled = false;
    const loadingTimer = setTimeout(() => setLookupState('loading'), 0);

    (async () => {
      try {
        const driverRes = await fetch(
          `${SUPABASE_URL}/rest/v1/users?driver_id=eq.${encodeURIComponent(driverIdInput)}&role=eq.driver&select=phone&limit=1`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );
        const driverRows = await driverRes.json();
        const driverPhone = driverRows?.[0]?.phone;
        if (!driverPhone) {
          if (!cancelled) {
            setLookupState('notfound');
            setMatchedOrder(null);
          }
          return;
        }

        const orderRes = await fetch(
          `${SUPABASE_URL}/rest/v1/orders?driver_phone=eq.${encodeURIComponent(driverPhone)}&passenger_phone=eq.${encodeURIComponent(getUser().phone)}&status=eq.completed&driver_paid=eq.false&order=created_at.desc&limit=1`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );
        const orderRows = await orderRes.json();
        const order = orderRows?.[0];
        if (!order) {
          if (!cancelled) {
            setLookupState('notfound');
            setMatchedOrder(null);
          }
          return;
        }

        if (!cancelled) {
          setMatchedOrder(order);
          setLookupState('found');
        }
      } catch {
        if (!cancelled) {
          setLookupState('notfound');
          setMatchedOrder(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(loadingTimer);
    };
  }, [driverIdInput]);

  const handleDigitPress = (digit: string) => {
    if (driverIdInput.length >= DRIVER_ID_LENGTH) return;
    setDriverIdInput((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setDriverIdInput((prev) => prev.slice(0, -1));
  };

  const handlePay = async () => {
    if (!matchedOrder) return;
    setPaying(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?id=eq.${matchedOrder.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            driver_paid: true,
            driver_paid_amount: matchedOrder.price,
            driver_withdrawn: false,
          }),
        }
      );

      if (!res.ok) throw new Error('update failed');

      await notifyLocal(t('menuPayDriver.successTitle'), t('menuPayDriver.successMessage'));
      Alert.alert(t('menuPayDriver.successTitle'), t('menuPayDriver.successMessage'));
      router.back();
    } catch {
      Alert.alert(t('menuPayDriver.errorTitle'), t('menuPayDriver.errorPayFailed'));
    } finally {
      setPaying(false);
    }
  };

  const keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'back'],
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={BG_GRADIENT} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={28} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('menuPayDriver.headerTitle')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.idLabel}>{t('menuPayDriver.driverIdLabel')}</Text>
        <View style={styles.idBoxRow}>
          {Array.from({ length: DRIVER_ID_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.idBox,
                driverIdInput.length === i && styles.idBoxActive,
                lookupState === 'notfound' && styles.idBoxError,
              ]}
            >
              <Text style={[styles.idBoxText, driverIdInput.length === i && styles.idBoxTextActive]}>{driverIdInput[i] || ''}</Text>
            </View>
          ))}
        </View>

        <View style={styles.priceCard}>
          {lookupState === 'idle' && <Text style={styles.priceHint}>—</Text>}
          {lookupState === 'loading' && (
            <View style={styles.priceRow}>
              <ActivityIndicator color="#0066FF" />
              <Text style={styles.priceHint}>{t('menuPayDriver.searching')}</Text>
            </View>
          )}
          {lookupState === 'notfound' && (
            <>
              <Text style={styles.notFoundTitle}>{t('menuPayDriver.notFoundTitle')}</Text>
              <Text style={styles.notFoundSubtitle}>{t('menuPayDriver.notFoundSubtitle')}</Text>
            </>
          )}
          {lookupState === 'found' && matchedOrder && (
            <>
              <Text style={styles.priceLabel}>{t('menuPayDriver.priceLabel')}</Text>
              <Text style={styles.priceValue}>{matchedOrder.price} ₸</Text>
              <Text style={styles.driverNameHint}>
                {matchedOrder.driver_first_name} {matchedOrder.driver_last_name?.[0] || ''} — {t('menuPayDriver.foundHint')}
              </Text>
            </>
          )}
        </View>

        <View style={styles.spacer} />

        <View style={styles.keypad}>
          {keypadRows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.keypadRow}>
              {row.map((key, keyIdx) => {
                if (key === '') return <View key={keyIdx} style={styles.keypadKeyEmpty} />;
                if (key === 'back') {
                  return (
                    <TouchableOpacity
                      key={keyIdx}
                      style={styles.keypadKey}
                      onPress={handleBackspace}
                      activeOpacity={0.7}
                    >
                      <Delete size={22} color="#000000" />
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={keyIdx}
                    style={styles.keypadKey}
                    onPress={() => handleDigitPress(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.keypadKeyText}>{key}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.payButton, (lookupState !== 'found' || paying) && styles.payButtonDisabled]}
          onPress={handlePay}
          activeOpacity={0.85}
          disabled={lookupState !== 'found' || paying}
        >
          <LinearGradient
            colors={lookupState === 'found' ? GOLD_GRADIENT : GOLD_GRADIENT_DISABLED}
            style={styles.payButtonGradient}
          >
            {paying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.payButtonText}>{t('menuPayDriver.payButton')}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
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
    marginBottom: 16,
  },
  headerTitle: { fontSize: 20, fontFamily: 'Inter-SemiBold', color: '#000000' },
  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 24 },
  idLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  idBoxRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  idBox: {
    width: 42,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#FFC800',
    borderWidth: 2,
    borderColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  idBoxActive: {
    borderColor: '#D4AF37',
    backgroundColor: '#0066FF',
  },
  idBoxError: {
    borderColor: '#D4AF37',
    backgroundColor: '#FFC800',
  },
  idBoxText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#000000',
  },
  idBoxTextActive: {
    color: '#FFFFFF',
  },
  priceCard: {
    backgroundColor: '#FFC800',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D4AF37',
    alignItems: 'center',
    minHeight: 90,
    justifyContent: 'center',
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceHint: { color: 'rgba(0, 0, 0, 0.55)', fontFamily: 'Inter-Regular', fontSize: 14 },
  priceLabel: { color: '#000000', fontFamily: 'Inter-Regular', fontSize: 13 },
  priceValue: { color: '#000000', fontFamily: 'Inter-Bold', fontSize: 32, marginTop: 4 },
  driverNameHint: { color: '#000000', fontFamily: 'Inter-Regular', fontSize: 13, marginTop: 8 },
  notFoundTitle: { color: '#000000', fontFamily: 'Inter-SemiBold', fontSize: 15, textAlign: 'center' },
  notFoundSubtitle: { color: 'rgba(0, 0, 0, 0.55)', fontFamily: 'Inter-Regular', fontSize: 12, textAlign: 'center', marginTop: 6 },
  spacer: { flex: 1 },
  keypad: { marginBottom: 16 },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 14,
  },
  keypadKey: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFC800',
    borderWidth: 1,
    borderColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadKeyEmpty: { width: 72, height: 72 },
  keypadKeyText: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  payButton: { height: 56, borderRadius: 16, overflow: 'hidden' },
  payButtonDisabled: { opacity: 0.7 },
  payButtonGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  payButtonText: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Inter-SemiBold' },
});
