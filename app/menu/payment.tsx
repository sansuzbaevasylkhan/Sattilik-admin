import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, CreditCard, Plus, Wallet, Banknote } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslation } from '@/hooks/useTranslation';
import { getUser } from '@/store/userStore';
import { BG_GRADIENT, BG_DARK, GOLD_GRADIENT, GOLD_PRIMARY, GOLD_SOFT_FILL } from '@/lib/theme';

export default function PaymentScreen() {
  const { t } = useTranslation();
  const isDriver = getUser().role === 'driver';
  const methods = [t('menuPayment.methodCash'), t('menuPayment.methodQr')];
  return (
    <View style={styles.container}>
      <LinearGradient colors={BG_GRADIENT} style={styles.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('menuPayment.headerTitle')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.fareButton}
          activeOpacity={0.85}
          onPress={() => router.push(isDriver ? '/menu/driver-earnings' : '/menu/pay-driver')}
        >
          <LinearGradient colors={GOLD_GRADIENT} style={styles.fareButtonGradient}>
            <Banknote size={20} color={BG_DARK} />
            <Text style={styles.fareButtonText}>
              {isDriver ? t('menuPayment.driverFareButton') : t('menuPayment.payFareButton')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.balanceCard}>
          <LinearGradient colors={GOLD_GRADIENT} style={styles.balanceGradient}>
            <View style={styles.balanceIconRow}>
              <Wallet size={28} color="rgba(255,255,255,0.8)" />
            </View>
            <Text style={styles.balanceLabel}>{t('menuPayment.balanceLabel')}</Text>
            <Text style={styles.balanceAmount}>0 ₸</Text>
          </LinearGradient>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('menuPayment.cardsTitle')}</Text>
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.7}
            onPress={() => router.push('/menu/add-card')}
          >
            <Plus size={16} color={GOLD_PRIMARY} />
            <Text style={styles.addButtonText}>{t('menuPayment.addButton')}</Text>
          </TouchableOpacity>
        </View>


        <View style={styles.emptyCard}>
          <CreditCard size={48} color="rgba(255,255,255,0.15)" />
          <Text style={styles.emptyText}>{t('menuPayment.emptyText')}</Text>
          <Text style={styles.emptySubtext}>{t('menuPayment.emptySubtext')}</Text>
        </View>

        <View style={styles.methodsSection}>
          <Text style={styles.sectionTitle}>{t('menuPayment.methodsTitle')}</Text>
          {methods.map((method) =>
            method === t('menuPayment.methodQr') ? (
              <TouchableOpacity
                key={method}
                style={styles.methodItem}
                activeOpacity={0.75}
                onPress={() => router.push('/menu/qr-scan' as any)}
              >
                <View style={styles.methodDot} />
                <Text style={styles.methodText}>{method}</Text>
              </TouchableOpacity>
            ) : (
              <View key={method} style={styles.methodItem}>
                <View style={styles.methodDot} />
                <Text style={styles.methodText}>{method}</Text>
              </View>
            )
          )}
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
  headerTitle: { fontSize: 20, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  content: { paddingHorizontal: 24 },
  fareButton: { height: 56, borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  fareButtonGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  fareButtonText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Inter-SemiBold' },
  balanceCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    height: 140,
  },
  balanceGradient: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  balanceIconRow: { alignItems: 'flex-end' },
  balanceLabel: { fontSize: 14, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.7)' },
  balanceAmount: { fontSize: 36, fontFamily: 'Inter-Bold', color: '#FFFFFF' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: GOLD_SOFT_FILL,
  },
  addButtonText: { fontSize: 13, fontFamily: 'Inter-SemiBold', color: GOLD_PRIMARY, },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 24,
  },
  emptyText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: 'rgba(255,255,255,0.4)', marginTop: 12 },
  emptySubtext: { fontSize: 13, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.25)', marginTop: 4 },
  methodsSection: { marginTop: 4 },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  methodDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    marginRight: 12,
  },
  methodText: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
});
