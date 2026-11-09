import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { MapPin, Shield, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from '@/hooks/useTranslation';
import { BG_GRADIENT, BG_DARK, GOLD_GRADIENT, GOLD_SOFT_FILL, GOLD_SOFT_BORDER, GOLD_FOCUSED_BORDER, GOLD_STRONG_FILL } from '@/lib/theme';

const ICONS = [MapPin, Shield, Clock];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const ONBOARDING_DATA = [
    { icon: ICONS[0], title: t('onboarding.title1'), description: t('onboarding.desc1') },
    { icon: ICONS[1], title: t('onboarding.title2'), description: t('onboarding.desc2') },
    { icon: ICONS[2], title: t('onboarding.title3'), description: t('onboarding.desc3') },
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const iconScale = useRef(new Animated.Value(1)).current;

  const skipToEnd = () => {
    router.replace('/home');
  };

  const goToNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentIndex(currentIndex + 1);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(iconScale, {
            toValue: 1.1,
            friction: 4,
            useNativeDriver: true,
          }),
        ]).start(() => {
          Animated.spring(iconScale, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
          }).start();
        });
      });
    } else {
      skipToEnd();
    }
  };

  const item = ONBOARDING_DATA[currentIndex];
  const IconComponent = item.icon;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#050505', '#151515']}
        style={styles.background}
      />

      <View style={styles.skipContainer}>
        <TouchableOpacity onPress={skipToEnd} activeOpacity={0.7}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        <Animated.View
          style={[
            styles.iconCircle,
            {
              transform: [{ scale: iconScale }],
            },
          ]}
        >
          <IconComponent size={64} color="#FFFFFF" strokeWidth={1.5} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </Animated.View>
      </View>

      <View style={styles.bottomContainer}>
        <View style={styles.pagination}>
          {ONBOARDING_DATA.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={goToNext}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FFD700', '#F5B800']}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextButtonText}>{t('onboarding.next')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFill,
  },
  skipContainer: {
    paddingTop: 60,
    paddingRight: 24,
    alignItems: 'flex-end',
  },
  skipText: {
    color: '#A0A0A0',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#151515',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#A0A0A0',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  bottomContainer: {
    paddingBottom: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 6,
  },
  activeDot: {
    backgroundColor: '#FFD700',
    width: 24,
  },
  nextButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#000000',
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
});
