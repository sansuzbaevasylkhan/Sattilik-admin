import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { BG_GRADIENT } from '@/lib/theme';
import { hydrateUser, getUser } from '@/store/userStore';

const SPLASH_DURATION_MS = 3000;
const FADE_IN_MS = 600;
const FADE_OUT_MS = 400;

export default function Index() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Fade-in + scale (логотип пайда болғанда дыбыс/дірілдеу)
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_IN_MS,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    // Дыбыс + дірілдеу
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Сақталған сессияны параллельде оқимыз (splash уақытымен қатар жүреді).
    const hydration = hydrateUser();

    // 3 секундтан кейін fade-out + redirect
    const timeout = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      hydration.then(() => {
        const user = getUser();
        const nextRoute =
          user.phone && user.role === 'driver'
            ? '/driver-order'
            : user.phone && user.role === 'passenger'
              ? '/order'
              : '/onboarding';

        Animated.timing(opacity, {
          toValue: 0,
          duration: FADE_OUT_MS,
          useNativeDriver: true,
        }).start(() => {
          router.replace(nextRoute);
        });
      });
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(timeout);
  }, [opacity, scale]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={BG_GRADIENT}
        style={styles.gradient}
      >
        <Animated.View
          style={[
            styles.logoWrap,
            { opacity, transform: [{ scale }] },
          ]}
        >
          <Image
            source={require('@/assets/images/logo_splash.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoWrap: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: 200, height: 200 },
});
