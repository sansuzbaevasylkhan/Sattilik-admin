import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, User, Car, Check } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslation, Lang } from '@/hooks/useTranslation';
import { BG_GRADIENT, BG_DARK, BG_MID, BG_DEEP, GOLD_GRADIENT } from '@/lib/theme';

const LANG_LABEL: Record<Lang, string> = {
  kk: 'Қазақша',
  ru: 'Русский',
};

export default function HomeScreen() {
  const { t, lang, setLang } = useTranslation();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [rotateAnim, floatAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -14],
  });

  const goTo = (role: 'passenger' | 'driver') => {
    setLangMenuOpen(false);
    router.push({ pathname: '/register', params: { role } });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={BG_GRADIENT}
        style={styles.background}
      />

      <View style={styles.langWrap}>
        <TouchableOpacity
          style={styles.langButton}
          onPress={() => setLangMenuOpen((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.langButtonText}>{LANG_LABEL[lang]}</Text>
          <ChevronDown size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {langMenuOpen && (
          <View style={styles.langMenu}>
            {(['kk', 'ru'] as Lang[]).map((code) => (
              <TouchableOpacity
                key={code}
                style={styles.langMenuItem}
                onPress={() => {
                  setLang(code);
                  setLangMenuOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.langMenuItemText}>{LANG_LABEL[code]}</Text>
                {lang === code && <Check size={16} color="#FFD700" />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.imageWrap,
            { transform: [{ translateY }, { rotate }] },
          ]}
        >
          <Image
            source={require('@/assets/images/logo_splash.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </Animated.View>

        <Text style={styles.title}>{t('home.title')}</Text>
        <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
      </View>

      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={styles.roleButton}
          onPress={() => goTo('passenger')}
          activeOpacity={0.85}
        >
          <LinearGradient colors={GOLD_GRADIENT} style={styles.roleButtonGradient}>
            <User size={24} color={BG_DARK} style={{ marginBottom: 6 }} />
            <Text style={styles.roleButtonText}>{t('home.passenger')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.roleButton}
          onPress={() => goTo('driver')}
          activeOpacity={0.85}
        >
          <LinearGradient colors={GOLD_GRADIENT} style={styles.roleButtonGradient}>
            <Car size={24} color={BG_DARK} style={{ marginBottom: 6 }} />
            <Text style={styles.roleButtonText}>{t('home.driver')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { ...StyleSheet.absoluteFillObject },
  langWrap: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  langButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  langMenu: {
    marginTop: 8,
    backgroundColor: BG_DARK,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    minWidth: 140,
  },
  langMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  langMenuItemText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  imageWrap: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  image: {
    width: 180,
    height: 180,
  },
  title: {
    fontSize: 30,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  roleButton: {
    flex: 1,
    height: 96,
    borderRadius: 20,
    overflow: 'hidden',
  },
  roleButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleButtonText: {
    color: BG_DARK,
    fontSize: 17,
    fontFamily: 'Inter-Bold',
  },
});
