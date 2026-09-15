import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Linking,
  Image,
} from 'react-native';
import {
  X,
  Star,
  CreditCard,
  Settings,
  Clock,
  BookOpen,
  ChevronRight,
  Instagram,
  Send,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { getUser, subscribeUser } from '@/store/userStore';
import { useTranslation } from '@/hooks/useTranslation';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(width * 0.82, 340);

interface MenuDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const MENU_ITEMS = [
  {
    icon: CreditCard,
    labelKey: 'menuPayment',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.12)',
    route: '/menu/payment',
  },
  {
    icon: Clock,
    labelKey: 'menuHistory',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
    route: '/menu/history',
  },
  {
    icon: BookOpen,
    labelKey: 'menuGuide',
    color: '#2563EB',
    bg: 'rgba(37,99,235,0.12)',
    route: '/menu/guide-chat',
  },
  {
    icon: Settings,
    labelKey: 'menuSettings',
    color: '#94A3B8',
    bg: 'rgba(148,163,184,0.12)',
    route: '/menu/settings',
  },
];

export default function MenuDrawer({ visible, onClose }: MenuDrawerProps) {
  const { t, lang, setLang } = useTranslation();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [user, setUser] = useState(getUser());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const unsub = subscribeUser(() => setUser(getUser()));
    return unsub;
  }, []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted && !visible) return null;

  const handleNavigate = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 250);
  };

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || t('menuDrawer.defaultUserName');
  const roleLabel = user.role === 'driver' ? t('menuDrawer.roleDriver') : t('menuDrawer.rolePassenger');

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <Animated.View
        style={[styles.overlay, { opacity: overlayAnim }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      <Animated.View
        style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <View style={styles.closeRow}>
          <TouchableOpacity
            onPress={() => setLang(lang === 'kk' ? 'ru' : 'kk')}
            style={styles.langToggle}
            activeOpacity={0.7}
          >
            <Text style={styles.langToggleText}>{lang === 'kk' ? 'ҚАЗ' : 'РУС'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <X size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.profileSection}
          onPress={() => handleNavigate('/menu/profile')}
          activeOpacity={0.8}
        >
          <View style={styles.avatarWrap}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.avatarImg}
            />
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName}>{fullName}</Text>
            <Text style={styles.profileRole}>{roleLabel}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={14} color="rgba(255,255,255,0.2)" fill="rgba(255,255,255,0.1)" />
              ))}
              <Text style={styles.ratingText}>0.0</Text>
            </View>
          </View>
          <ChevronRight size={20} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.menuList}>
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.route}
                style={styles.menuItem}
                onPress={() => handleNavigate(item.route)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: item.bg }]}>
                  <Icon size={20} color={item.color} />
                </View>
                <Text style={styles.menuItemLabel}>{t(`menuDrawer.${item.labelKey}`)}</Text>
                <ChevronRight size={18} color="rgba(255,255,255,0.25)" />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.spacer} />

        <View style={styles.socialSection}>
          <Text style={styles.socialLabel}>{t('menuDrawer.socialLabel')}</Text>
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => Linking.openURL('https://www.instagram.com/sattilik.app')}
              activeOpacity={0.75}
            >
              <View style={[styles.socialIconWrap, { backgroundColor: 'rgba(225,48,108,0.15)' }]}>
                <Instagram size={22} color="#E1306C" />
              </View>
              <Text style={styles.socialName}>{t('menuDrawer.socialInstagram')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => Linking.openURL('https://t.me/sattiliktaxionelinkapp')}
              activeOpacity={0.75}
            >
              <View style={[styles.socialIconWrap, { backgroundColor: 'rgba(0,136,204,0.15)' }]}>
                <Send size={22} color="#0088CC" />
              </View>
              <Text style={styles.socialName}>{t('menuDrawer.socialTelegram')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => Linking.openURL('https://sattiliktaxionelinkapp.lovable.app')}
              activeOpacity={0.75}
            >
              <View style={[styles.socialIconWrap, { backgroundColor: 'rgba(37,99,235,0.15)' }]}>
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={styles.socialLogo}
                />
              </View>
              <Text style={styles.socialName}>{t('menuDrawer.socialAskdrv')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#0D1E35',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
    paddingTop: 56,
    paddingBottom: 32,
  },
  closeRow: {
    position: 'absolute',
    top: 16,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeButton: {
    padding: 8,
  },
  langToggle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  langToggleText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 8,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFD700',
    marginRight: 14,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 6,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255,255,255,0.35)',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  menuList: {
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  spacer: {
    flex: 1,
  },
  socialSection: {
    paddingHorizontal: 20,
  },
  socialLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    alignItems: 'center',
    flex: 1,
  },
  socialIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  socialLogo: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  socialName: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255,255,255,0.5)',
  },
});
