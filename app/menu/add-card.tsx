import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, CreditCard, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslation } from '@/hooks/useTranslation';
import { getUser } from '@/store/userStore';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export default function AddCardScreen() {
  const { t } = useTranslation();
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [saving, setSaving] = useState(false);

  const isValid = useMemo(() => {
    const digits = cardNumber.replace(/\D/g, '');
    const exp = expiry.replace(/\s/g, '');
    const cvcDigits = cvc.replace(/\D/g, '');

    return (
      digits.length >= 12 &&
      exp.length >= 4 &&
      cvcDigits.length >= 3 &&
      cardHolder.trim().length >= 2
    );
  }, [cardNumber, expiry, cvc, cardHolder]);

  const handleAdd = async () => {
    if (!isValid) {
      Alert.alert(t('menuAddCard.alertWarningTitle'), t('menuAddCard.alertWarningMessage'));
      return;
    }

    // Қауіпсіздік үшін толық карта нөмірі/CVV серверге жіберілмейді —
    // тек соңғы 4 цифр мен иесінің аты сақталады (көрсету үшін ғана).
    const digits = cardNumber.replace(/\D/g, '');
    const last4 = digits.slice(-4);

    setSaving(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/save-driver-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          phone: getUser().phone,
          card_last4: last4,
          card_holder: cardHolder.trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Alert.alert(t('menuAddCard.alertWarningTitle'), data?.error || t('menuAddCard.alertDoneMessage'));
        return;
      }

      Alert.alert(t('menuAddCard.alertDoneTitle'), t('menuAddCard.alertDoneMessage'));
      router.back();
    } catch (e) {
      Alert.alert(t('menuAddCard.alertWarningTitle'), String(e));
    } finally {
      setSaving(false);
    }
  };

  const Field = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    maxLength,
  }: {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    placeholder: string;
    keyboardType?: any;
    maxLength?: number;
  }) => (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.input}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCapitalize="words"
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
    >
      <LinearGradient colors={['#B8860B', '#DAA520', '#FFD700']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('menuAddCard.headerTitle')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.cardPreview}>
          <LinearGradient colors={['#1D4ED8', '#2563EB']} style={styles.cardGradient}>
            <View style={styles.previewTop}>
              <CreditCard size={30} color="rgba(255,255,255,0.9)" />
            </View>
            <Text style={styles.previewNumber} numberOfLines={1}>
              {cardNumber.trim() ? cardNumber : '•••• •••• •••• ••••'}
            </Text>
            <View style={styles.previewBottomRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewLabel}>{t('menuAddCard.previewExpiryLabel')}</Text>
                <Text style={styles.previewValue}>{expiry.trim() ? expiry : 'MM/YY'}</Text>
              </View>
              <View style={{ width: 100 }}>
                <Text style={styles.previewLabel}>CVC</Text>
                <Text style={styles.previewValue}>{cvc.trim() ? cvc : '•••'}</Text>
              </View>
            </View>
            <Text style={styles.previewHolder} numberOfLines={1}>
              {cardHolder.trim() ? cardHolder : t('menuAddCard.previewHolderPlaceholder')}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.formBlock}>
          <Field
            label={t('menuAddCard.fieldCardNumberLabel')}
            value={cardNumber}
            onChangeText={(val) => setCardNumber(val)}
            placeholder={t('menuAddCard.fieldCardNumberPlaceholder')}
            keyboardType="number-pad"
            maxLength={23}
          />

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field
                label={t('menuAddCard.fieldExpiryLabel')}
                value={expiry}
                onChangeText={setExpiry}
                placeholder={t('menuAddCard.fieldExpiryPlaceholder')}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
            <View style={{ width: 140 }}>
              <Field
                label={t('menuAddCard.fieldCvcLabel')}
                value={cvc}
                onChangeText={setCvc}
                placeholder={t('menuAddCard.fieldCvcPlaceholder')}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>

          <Field
            label={t('menuAddCard.fieldHolderLabel')}
            value={cardHolder}
            onChangeText={setCardHolder}
            placeholder={t('menuAddCard.fieldHolderPlaceholder')}
            maxLength={40}
          />

          <TouchableOpacity
            style={[styles.submitButton, (!isValid || saving) && styles.submitDisabled]}
            onPress={handleAdd}
            activeOpacity={0.85}
            disabled={!isValid || saving}
          >
            <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.submitGradient}>
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.submitRow}>
                  <Plus size={18} color="#FFFFFF" />
                  <Text style={styles.submitText}>{t('menuAddCard.submitButton')}</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.hintText}>{t('menuAddCard.hintText')}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  cardPreview: {
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
    minHeight: 170,
    justifyContent: 'space-between',
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewNumber: {
    marginTop: 18,
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  previewBottomRow: {
    flexDirection: 'row',
    marginTop: 18,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  previewLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.65)',
  },
  previewValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  previewHolder: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
  },
  formBlock: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  fieldBlock: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 8,
  },
  inputWrap: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
  },
  input: {
    height: 52,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  row2: {
    flexDirection: 'row',
    gap: 12,
  },
  submitButton: {
    marginTop: 8,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  hintText: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
  },
});

