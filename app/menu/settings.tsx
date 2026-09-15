import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Bell, Globe, Shield, LogOut, ChevronDown, Sun, Moon } from 'lucide-react-native';
import { router } from 'expo-router';
import { BG_GRADIENT, BG_DARK, BG_MID, BG_DEEP, GOLD_PRIMARY, GOLD_SOFT_FILL, GOLD_MEDIUM_FILL, GOLD_MEDIUM_BORDER } from '@/lib/theme';
import { clearUser } from '@/store/userStore';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '@/hooks/useTranslation';

type Lang = 'kk' | 'ru';
type ThemeMode = 'day' | 'night';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lang, setLang] = useState<Lang>('kk');
  const [themeMode, setThemeMode] = useState<ThemeMode>('day');
  const [themeExpanded, setThemeExpanded] = useState(false);

  const backgroundColors = useMemo(() => {
    return BG_GRADIENT;
  }, []);


  const triggerVibration = async () => {
    if (!soundEnabled) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    clearUser();
    router.replace('/onboarding');
  };

  const handleToggleNotifications = async (next: boolean) => {
    setNotifications(next);
    // Сіз айтқан логика: дыбыс қосылса діріл болады, қосылмаса діріл болмайды.
    if (next) {
      await triggerVibration();
      // “push banner top-тен келеді” талабы үшін in-app banner.
      // Expo Push жоқ болғандықтан, бұл — визуалды локалды триггер.
    }
  };

  const LanguageValue = lang === 'kk' ? 'Қазақша' : 'Русский';
  const ThemeValue = themeMode === 'day' ? (lang === 'kk' ? 'Күн' : 'День') : (lang === 'kk' ? 'Түн' : 'Ночь');

  return (
    <View style={styles.container}>
      <LinearGradient colors={backgroundColors} style={styles.bg} />

      {notifications && (
        <View style={styles.topBanner} pointerEvents="none">
          <Text style={styles.topBannerTitle}>{t('menuSettings.bannerTitle')}</Text>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('menuSettings.settingsTitle')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>{t('menuSettings.sectionNotifications')}</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: GOLD_SOFT_FILL }]}>
              <Bell size={18} color={GOLD_PRIMARY} />
            </View>
            <Text style={styles.settingText}>{t('menuSettings.notifications')}</Text>
            <Switch
              value={notifications}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: GOLD_PRIMARY }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
              <Bell size={18} color="#F59E0B" />
            </View>
            <Text style={styles.settingText}>{t('menuSettings.sound')}</Text>
            <Switch
              value={soundEnabled}
              onValueChange={async (next) => {
                setSoundEnabled(next);
                if (next) {
                  await triggerVibration();
                }
              }}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: GOLD_PRIMARY }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>{t('menuSettings.sectionApp')}</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => setLang((p) => (p === 'kk' ? 'ru' : 'kk'))}
          >
            <View style={[styles.settingIcon, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
              <Globe size={18} color="#22C55E" />
            </View>
            <Text style={styles.settingText}>{t('menuSettings.language')}</Text>
            <Text style={styles.settingValue}>{LanguageValue}</Text>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <View>
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.7}
              onPress={() => setThemeExpanded((v) => !v)}
            >
              <View style={[styles.settingIcon, { backgroundColor: 'rgba(148,163,184,0.12)' }]}>
                {themeMode === 'day' ? <Sun size={18} color="#94A3B8" /> : <Moon size={18} color="#94A3B8" />}
              </View>
              <Text style={styles.settingText}>{t('menuSettings.theme')}</Text>
              <Text style={styles.settingValue}>{ThemeValue}</Text>
              <ChevronDown size={18} color="rgba(255,255,255,0.35)" style={themeExpanded ? styles.chevUp : undefined} />
            </TouchableOpacity>

            {themeExpanded && (
              <View style={styles.themeExpandedArea}>
                <TouchableOpacity
                  style={[styles.themeOption, themeMode === 'day' && styles.themeOptionActive]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setThemeMode('day');
                    setThemeExpanded(false);
                  }}
                >
                  <Text style={styles.themeOptionText}>{lang === 'kk' ? 'Күн' : 'День'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.themeOption, themeMode === 'night' && styles.themeOptionActive]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setThemeMode('night');
                    setThemeExpanded(false);
                  }}
                >
                  <Text style={styles.themeOptionText}>{lang === 'kk' ? 'Түн' : 'Ночь'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <View style={[styles.settingIcon, { backgroundColor: 'rgba(148,163,184,0.12)' }]}>
              <Shield size={18} color="#94A3B8" />
            </View>
            <Text style={styles.settingText}>{t('menuSettings.privacy')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <View style={[styles.settingIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
            <LogOut size={18} color="#EF4444" />
          </View>
          <Text style={styles.logoutText}>{t('menuSettings.logout')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { ...StyleSheet.absoluteFillObject },
  topBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: BG_DARK,
    paddingTop: 56,
    paddingBottom: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  topBannerTitle: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: { fontSize: 20, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  content: { paddingHorizontal: 24, paddingTop: 0 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  settingsCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingText: { flex: 1, fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  settingValue: { fontSize: 14, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.4)' },
  rowDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 68 },
  themeExpandedArea: {
    paddingLeft: 68,
    paddingRight: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  themeOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  themeOptionActive: {
    backgroundColor: GOLD_MEDIUM_FILL,
    borderColor: GOLD_MEDIUM_BORDER,
  },
  themeOptionText: {
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  chevUp: {
    transform: [{ rotate: '180deg' }],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    marginTop: 32,
  },
  logoutText: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#EF4444' },
});

