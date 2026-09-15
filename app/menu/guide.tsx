import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronDown, ChevronUp, Car, User, CreditCard, Star } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslation } from '@/hooks/useTranslation';

export default function GuideScreen() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<number | null>(1);

  const GUIDE_SECTIONS = [
    {
      id: 1,
      icon: User,
      color: '#2563EB',
      bg: 'rgba(37,99,235,0.12)',
      title: t('menuGuide.section1Title'),
      items: [
        t('menuGuide.section1Item1'),
        t('menuGuide.section1Item2'),
        t('menuGuide.section1Item3'),
        t('menuGuide.section1Item4'),
        t('menuGuide.section1Item5'),
      ],
    },
    {
      id: 2,
      icon: Car,
      color: '#22C55E',
      bg: 'rgba(34,197,94,0.12)',
      title: t('menuGuide.section2Title'),
      items: [
        t('menuGuide.section2Item1'),
        t('menuGuide.section2Item2'),
        t('menuGuide.section2Item3'),
        t('menuGuide.section2Item4'),
        t('menuGuide.section2Item5'),
      ],
    },
    {
      id: 3,
      icon: CreditCard,
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.12)',
      title: t('menuGuide.section3Title'),
      items: [
        t('menuGuide.section3Item1'),
        t('menuGuide.section3Item2'),
        t('menuGuide.section3Item3'),
      ],
    },
    {
      id: 4,
      icon: Star,
      color: '#E1306C',
      bg: 'rgba(225,48,108,0.12)',
      title: t('menuGuide.section4Title'),
      items: [
        t('menuGuide.section4Item1'),
        t('menuGuide.section4Item2'),
        t('menuGuide.section4Item3'),
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A1628', '#1A3A5C', '#0D2137']} style={styles.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('menuGuide.headerTitle')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.intro}>
          {t('menuGuide.intro')}
        </Text>

        {GUIDE_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isOpen = expanded === section.id;
          return (
            <View key={section.id} style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setExpanded(isOpen ? null : section.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.sectionIconCircle, { backgroundColor: section.bg }]}>
                  <Icon size={20} color={section.color} />
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {isOpen
                  ? <ChevronUp size={18} color="rgba(255,255,255,0.4)" />
                  : <ChevronDown size={18} color="rgba(255,255,255,0.4)" />
                }
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.sectionBody}>
                  {section.items.map((item, idx) => (
                    <View key={idx} style={styles.stepRow}>
                      <View style={[styles.stepNum, { backgroundColor: section.bg }]}>
                        <Text style={[styles.stepNumText, { color: section.color }]}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
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
    marginBottom: 16,
  },
  headerTitle: { fontSize: 20, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  intro: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sectionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: { flex: 1, fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 12,
    gap: 12,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNumText: { fontSize: 13, fontFamily: 'Inter-Bold' },
  stepText: { flex: 1, fontSize: 14, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.75)', lineHeight: 20 },
});
