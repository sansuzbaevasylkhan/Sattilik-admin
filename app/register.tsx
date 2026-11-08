import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Car, ChevronLeft, Send, ExternalLink } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { setUser } from '@/store/userStore';
import { useTranslation } from '@/hooks/useTranslation';
import {
  BG_GRADIENT,
  BG_DARK,
  GOLD_GRADIENT,
  GOLD_GRADIENT_DISABLED,
  GOLD_SOFT_FILL,
  GOLD_SOFT_BORDER,
  GOLD_MEDIUM_FILL,
  GOLD_MEDIUM_BORDER,
  GOLD_FOCUSED_FILL,
  GOLD_FOCUSED_BORDER,
} from '@/lib/theme';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!.trim();
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!.trim();
// Боттың @username (BotFather /setusername) — send-code-тағы TELEGRAM_BOT_USERNAME-мен бірдей.
// Қазір әдепкі: AsqDrvBot. Өзгерту үшін осында да, Edge Function-да да бірдей username жазыңыз.
const TELEGRAM_BOT_USERNAME =
  process.env.EXPO_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() || "sattiliktaxiappcodebot";

type Role = 'passenger' | 'driver' | null;
type Step = 'role' | 'phone' | 'code' | 'telegram' | 'driverDetails';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ role?: string }>();
  const initialRole: Role =
    params.role === 'passenger' || params.role === 'driver' ? params.role : null;

  const [selectedRole, setSelectedRole] = useState<Role>(initialRole);
  const [step, setStep] = useState<Step>(initialRole ? 'phone' : 'role');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rawDigits, setRawDigits] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [loading, setLoading] = useState(false);
  const [telegramLink, setTelegramLink] = useState<string>('');
  const [carName, setCarName] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [carColor, setCarColor] = useState('');

  const isDriver = selectedRole === 'driver';

  const passengerScale = useRef(new Animated.Value(1)).current;
  const driverScale = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;

  const animateTransition = (callback: () => void) => {
    Animated.timing(contentOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      callback();
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    animateTransition(() => setStep('phone'));
  };

  const animatePress = (anim: Animated.Value, callback?: () => void) => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => callback?.());
  };

  const formatDisplay = (digits: string) => {
    if (digits.length === 0) return '+7 (';
    let formatted = '+7 (';
    if (digits.length > 0) {
      formatted += digits.substring(0, Math.min(3, digits.length));
    }
    if (digits.length >= 3) {
      formatted += ') ' + digits.substring(3, Math.min(6, digits.length));
    }
    if (digits.length >= 6) {
      formatted += ' ' + digits.substring(6, Math.min(8, digits.length));
    }
    if (digits.length >= 8) {
      formatted += ' ' + digits.substring(8, Math.min(10, digits.length));
    }
    return formatted;
  };

  const handlePhoneChange = (text: string) => {
    const allDigits = text.replace(/\D/g, '');
    let userDigits = allDigits;
    if (allDigits.startsWith('7') || allDigits.startsWith('8')) {
      userDigits = allDigits.substring(1);
    }
    setRawDigits(userDigits.substring(0, 10));
  };

  const handleSendCode = async () => {
    if (rawDigits.length < 10) {
      Alert.alert(t('common.warning'), t('register.errorPhoneIncomplete'));
      return;
    }
    if (!isDriver && (!firstName.trim() || !lastName.trim())) {
      Alert.alert(t('common.warning'), t('register.errorNameRequired'));
      return;
    }
    if (!selectedRole) {
      Alert.alert(t('common.warning'), t('register.errorRoleRequired'));
      return;
    }

    setLoading(true);
    try {
      const url = `${SUPABASE_URL}/functions/v1/send-code`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          phone: `+7${rawDigits}`,
          first_name: isDriver ? '' : firstName.trim(),
          last_name: isDriver ? '' : lastName.trim(),
          role: selectedRole,
        }),
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { error: text };
      }

      if (!response.ok) {
        const errMsg = data?.error || data?.details || t('register.errorSendCodeFailed');
        Alert.alert(t('common.error'), `${errMsg}\n\nHTTP: ${response.status}`);
        console.error('send-code failed:', { url, status: response.status, data });
        return;
      }

      // send-code Telegram сілтемесін қайтарады.
      // Код Telegram-қа осы сілтеме арқылы байланысқаннан кейін жіберіледі.
      // Егер пайдаланушы бұрын Telegram-ты байланыстырған болса,
      // код бірден жіберіледі — telegram қадамын өткіземіз.
      const link =
        data?.telegram_link ||
        // Fallback: Edge Function жауап бермесе, клиент жағынан жасаймыз.
        `https://t.me/${TELEGRAM_BOT_USERNAME}?start=7${rawDigits}`;
      const alreadyLinked = !!data?.telegram_linked;
      setTelegramLink(link);

      // Байланысқан болса — Telegram қадамын өткізіп, бірден код енгізуге өту.
      // Әйтпесе — "Telegram-ты ашу" қадамын көрсету.
      animateTransition(() => {
        if (alreadyLinked) {
          setStep('code');
        } else {
          setStep('telegram');
        }
      });
    } catch (e) {
      Alert.alert(t('common.error'), `${t('register.errorNetwork')}: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTelegram = async () => {
    if (!telegramLink) {
      Alert.alert(t('common.error'), t('register.errorTelegramLinkMissing'));
      return;
    }
    try {
      const supported = await Linking.canOpenURL(telegramLink);
      if (!supported) {
        Alert.alert(t('common.error'), t('register.errorTelegramNotInstalled'));
        return;
      }
      await Linking.openURL(telegramLink);
    } catch (e) {
      Alert.alert(t('common.error'), `${t('register.errorTelegramOpenFailed')}: ${String(e)}`);
    }
  };

  const handleProceedToCode = () => {
    animateTransition(() => setStep('code'));
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length < 4) {
      setCodeError(t('register.errorCodeTooShort'));
      return;
    }

    setLoading(true);
    setCodeError('');
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          phone: `+7${rawDigits}`,
          code: verificationCode,
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const debug = data?.debug;
        const debugText = debug
          ? `\nphone: ${debug.phone}\nnormalizedPhone: ${debug.normalizedPhone}\ncode: ${debug.code}\nrowsFound: ${debug.rowsFound}`
          : '';
        setCodeError((data.error || t('register.errorCodeInvalid')) + debugText);
        return;
      }

      setUser({
        firstName: data.first_name || firstName,
        lastName: data.last_name || lastName,
        phone: `+7${rawDigits}`,
        role: data.role || selectedRole,
      });

      if (selectedRole === 'passenger') {
        router.replace('/order');
      } else {
        animateTransition(() => setStep('driverDetails'));
      }
    } catch {
      setCodeError(t('register.errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDriverDetails = async () => {
    if (!firstName.trim() || !lastName.trim() || !carName.trim() || !carNumber.trim() || !carColor.trim()) {
      Alert.alert(t('common.warning'), t('register.errorDriverDetailsRequired'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/update-driver-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          phone: `+7${rawDigits}`,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          car_name: carName.trim(),
          car_number: carNumber.trim(),
          car_color: carColor.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(t('common.error'), data?.error || t('register.errorSaveDriverProfileFailed'));
        return;
      }

      setUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: `+7${rawDigits}`,
        role: 'driver',
        driverId: data.driver_id || null,
      });

      router.replace('/driver-order');
    } catch (e) {
      Alert.alert(t('common.error'), `${t('register.errorNetwork')}: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'driverDetails') {
      router.back();
      return;
    }
    if (step === 'code') {
      // Код қадамынан кері — телефон қадамына.
      // Telegram қадамын аттаймыз, өйткені "Код қайта жіберу" басу
      // кезінде send-code бұрын байланысқан болса, бірден code-қа қайтарады.
      animateTransition(() => {
        setStep('phone');
        setVerificationCode('');
        setCodeError('');
      });
    } else if (step === 'telegram') {
      animateTransition(() => {
        setStep('phone');
        setTelegramLink('');
      });
    } else if (step === 'phone') {
      if (initialRole) {
        router.back();
        return;
      }
      animateTransition(() => {
        setStep('role');
        setSelectedRole(null);
        setRawDigits('');
        setFirstName('');
        setLastName('');
      });
    } else {
      router.back();
    }
  };

  const getStepTitle = () => {
    if (step === 'role') return t('register.stepTitleRole');
    if (step === 'phone') return t('register.stepTitlePhone');
    if (step === 'telegram') return t('register.stepTitleTelegram');
    if (step === 'driverDetails') return t('register.stepTitleDriverDetails');
    return t('register.stepTitleCode');
  };

  const getRegisterHint = () => {
    if (selectedRole === 'passenger') return t('register.hintPassenger');
    if (selectedRole === 'driver') return t('register.hintDriver');
    return '';
  };

  const canSendCode = isDriver
    ? rawDigits.length >= 10
    : rawDigits.length >= 10 && firstName.trim().length > 0 && lastName.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
    >
      <LinearGradient
        colors={BG_GRADIENT}
        style={styles.background}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} activeOpacity={0.7}>
          <ChevronLeft size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logoImage}
            />
          </View>
        </View>

        <Animated.View style={{ opacity: contentOpacity }}>
          {step === 'role' && (
            <Text style={styles.welcome}>{t('register.welcome')}</Text>
          )}
          <Text style={styles.subtitle}>{getStepTitle()}</Text>

          {step === 'phone' && getRegisterHint() ? (
            <Text style={styles.registerHint}>{getRegisterHint()}</Text>
          ) : null}

          {step === 'role' && (
            <View style={styles.roleContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  animatePress(passengerScale, () => handleRoleSelect('passenger'))
                }
              >
                <Animated.View
                  style={[
                    styles.roleCard,
                    selectedRole === 'passenger' && styles.roleCardActive,
                    { transform: [{ scale: passengerScale }] },
                  ]}
                >
                  <View
                    style={[
                      styles.roleIconCircle,
                      selectedRole === 'passenger' && styles.roleIconCircleActive,
                    ]}
                  >
                    <User
                      size={32}
                      color={selectedRole === 'passenger' ? BG_DARK : '#FFD700'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.roleTitle,
                      selectedRole === 'passenger' && styles.roleTitleActive,
                    ]}
                  >
                    {t('register.rolePassengerTitle')}
                  </Text>
                  <Text
                    style={[
                      styles.roleDesc,
                      selectedRole === 'passenger' && styles.roleDescActive,
                    ]}
                  >
                    {t('register.rolePassengerDesc')}
                  </Text>
                </Animated.View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  animatePress(driverScale, () => handleRoleSelect('driver'))
                }
              >
                <Animated.View
                  style={[
                    styles.roleCard,
                    selectedRole === 'driver' && styles.roleCardActive,
                    { transform: [{ scale: driverScale }] },
                  ]}
                >
                  <View
                    style={[
                      styles.roleIconCircle,
                      selectedRole === 'driver' && styles.roleIconCircleActive,
                    ]}
                  >
                    <Car
                      size={32}
                      color={selectedRole === 'driver' ? BG_DARK : '#FFD700'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.roleTitle,
                      selectedRole === 'driver' && styles.roleTitleActive,
                    ]}
                  >
                    {t('register.roleDriverTitle')}
                  </Text>
                  <Text
                    style={[
                      styles.roleDesc,
                      selectedRole === 'driver' && styles.roleDescActive,
                    ]}
                  >
                    {t('register.roleDriverDesc')}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            </View>
          )}

          {step === 'phone' && (
            <View style={styles.phoneSection}>
              {!isDriver && (
                <View style={styles.nameRow}>
                  <View style={[styles.inputContainer, styles.nameInput]}>
                    <TextInput
                      style={styles.textInput}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder={t('register.firstNamePlaceholder')}
                      placeholderTextColor="rgba(255,255,255,0.35)"
                    />
                  </View>
                  <View style={[styles.inputContainer, styles.nameInput]}>
                    <TextInput
                      style={styles.textInput}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder={t('register.lastNamePlaceholder')}
                      placeholderTextColor="rgba(255,255,255,0.35)"
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.phoneInput}
                  value={formatDisplay(rawDigits)}
                  onChangeText={handlePhoneChange}
                  placeholder={t('register.phonePlaceholder')}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  keyboardType="phone-pad"
                  maxLength={18}
                />
              </View>

              <TouchableOpacity
                style={[styles.sendCodeButton, !canSendCode && styles.sendCodeButtonDisabled]}
                onPress={handleSendCode}
                activeOpacity={0.8}
                disabled={!canSendCode || loading}
              >
                <LinearGradient
                  colors={
                    canSendCode
                      ? GOLD_GRADIENT
                      : GOLD_GRADIENT_DISABLED
                  }
                  style={styles.sendCodeGradient}
                >
                  <Send size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.sendCodeText}>{loading ? t('register.sending') : t('register.sendCode')}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.hintText}>{t('register.hintTelegramCode')}</Text>
            </View>
          )}

          {step === 'telegram' && (
            <View style={styles.telegramSection}>
              <View style={styles.telegramCard}>
                <View style={styles.telegramIconCircle}>
                  <Send size={32} color="#FFFFFF" />
                </View>

                <Text style={styles.telegramTitle}>{t('register.telegramOpenTitle')}</Text>

                <Text style={styles.telegramDescription}>
                  {formatDisplay(rawDigits)} {t('register.telegramDescription')}
                </Text>

                <Text style={styles.telegramSteps}>{t('register.telegramSteps')}</Text>

                <TouchableOpacity
                  style={styles.telegramOpenButton}
                  onPress={handleOpenTelegram}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#0088CC', '#006699']}
                    style={styles.sendCodeGradient}
                  >
                    <ExternalLink size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.sendCodeText}>{t('register.telegramOpenButton')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleProceedToCode}
                activeOpacity={0.7}
                disabled={loading}
                style={styles.proceedButton}
              >
                <Text style={styles.proceedText}>{t('register.telegramProceed')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'code' && (
            <View style={styles.codeSection}>
              <View style={styles.telegramBadge}>
                <Send size={20} color="#0088CC" />
                <Text style={styles.telegramBadgeText}>{t('register.telegramSentBadge')}</Text>
              </View>

              <Text style={styles.codeDescription}>
                {formatDisplay(rawDigits)} {t('register.codeSentTo')}
              </Text>

              <View style={styles.codeInputContainer}>
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.codeDigitBox,
                      verificationCode.length === i && styles.codeDigitBoxActive,
                      codeError ? styles.codeDigitBoxError : null,
                    ]}
                  >
                    <Text style={styles.codeDigitText}>{verificationCode[i] || ''}</Text>
                  </View>
                ))}
              </View>

              <TextInput
                style={styles.hiddenCodeInput}
                value={verificationCode}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, '').substring(0, 4);
                  setVerificationCode(digits);
                  setCodeError('');
                }}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
              />

              {codeError ? <Text style={styles.errorText}>{codeError}</Text> : null}

              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  verificationCode.length < 4 && styles.sendCodeButtonDisabled,
                ]}
                onPress={handleVerifyCode}
                activeOpacity={0.8}
                disabled={verificationCode.length < 4 || loading}
              >
                <LinearGradient
                  colors={
                    verificationCode.length >= 4
                      ? GOLD_GRADIENT
                      : GOLD_GRADIENT_DISABLED
                  }
                  style={styles.sendCodeGradient}
                >
                  <Text style={styles.sendCodeText}>{loading ? t('register.verifying') : t('register.verify')}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSendCode}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={styles.resendText}>{t('register.resendCode')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'driverDetails' && (
            <View style={styles.phoneSection}>
              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, styles.nameInput]}>
                  <TextInput
                    style={styles.textInput}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder={t('register.lastNamePlaceholder')}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                  />
                </View>
                <View style={[styles.inputContainer, styles.nameInput]}>
                  <TextInput
                    style={styles.textInput}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder={t('register.firstNamePlaceholder')}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={carName}
                  onChangeText={setCarName}
                  placeholder={t('register.carNamePlaceholder')}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={carNumber}
                  onChangeText={setCarNumber}
                  placeholder={t('register.carNumberPlaceholder')}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={carColor}
                  onChangeText={setCarColor}
                  placeholder={t('register.carColorPlaceholder')}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                />
              </View>

              <TouchableOpacity
                style={styles.sendCodeButton}
                onPress={handleSaveDriverDetails}
                activeOpacity={0.8}
                disabled={loading}
              >
                <LinearGradient
                  colors={GOLD_GRADIENT}
                  style={styles.sendCodeGradient}
                >
                  <Text style={styles.sendCodeText}>
                    {loading ? t('register.sending') : t('register.loginButton')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFill,
  },
  header: {
    paddingTop: 60,
    paddingLeft: 24,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  welcome: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  registerHint: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginTop: -16,
    marginBottom: 24,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 32,
  },
  roleCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  roleCardActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    borderColor: '#FFD700',
  },
  roleIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleIconCircleActive: {
    backgroundColor: '#FFD700',
  },
  roleTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  roleTitleActive: {
    color: '#FFFFFF',
  },
  roleDesc: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.5)',
  },
  roleDescActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  phoneSection: {
    marginTop: 8,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  nameInput: {
    flex: 1,
  },
  inputContainer: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
  },
  textInput: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    paddingVertical: 14,
  },
  phoneInput: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    paddingVertical: 16,
    letterSpacing: 1,
  },
  sendCodeButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sendCodeButtonDisabled: {
    opacity: 0.6,
  },
  sendCodeGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  sendCodeText: {
    color: BG_DARK,
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  hintText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 12,
  },
  telegramSection: {
    marginTop: 8,
    alignItems: 'stretch',
  },
  telegramCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 136, 204, 0.4)',
  },
  telegramIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0088CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  telegramTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
    textAlign: 'center',
  },
  telegramDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  telegramSteps: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'left',
    lineHeight: 22,
    marginBottom: 20,
  },
  telegramOpenButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  proceedButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  proceedText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  codeSection: {
    marginTop: 8,
    alignItems: 'center',
  },
  telegramBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 136, 204, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  telegramBadgeText: {
    color: '#0088CC',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  codeDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  codeInputContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  codeDigitBox: {
    width: 60,
    height: 64,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeDigitBoxActive: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  codeDigitBoxError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  codeDigitText: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  hiddenCodeInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  verifyButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  resendText: {
    color: '#FFD700',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginTop: 8,
  },
});
