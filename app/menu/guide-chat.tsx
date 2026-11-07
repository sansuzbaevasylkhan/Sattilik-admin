import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Send,
  User,
  Car,
  CreditCard,
  Star,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslation } from '@/hooks/useTranslation';

type ChatMessage = {
  id: string;
  role: 'user' | 'bot';
  text: string;
};

function makeId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default function GuideChatScreen() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<number | null>(1);
  const [input, setInput] = useState('');

  const GUIDE_SECTIONS = useMemo(
    () => [
      {
        id: 1,
        icon: User,
        color: '#2563EB',
        bg: 'rgba(37,99,235,0.12)',
        title: t('menuGuideChat.section1Title'),
        items: [
          t('menuGuideChat.section1Item1'),
          t('menuGuideChat.section1Item2'),
          t('menuGuideChat.section1Item3'),
          t('menuGuideChat.section1Item4'),
          t('menuGuideChat.section1Item5'),
        ],
      },
      {
        id: 2,
        icon: Car,
        color: '#22C55E',
        bg: 'rgba(34,197,94,0.12)',
        title: t('menuGuideChat.section2Title'),
        items: [
          t('menuGuideChat.section2Item1'),
          t('menuGuideChat.section2Item2'),
          t('menuGuideChat.section2Item3'),
          t('menuGuideChat.section2Item4'),
          t('menuGuideChat.section2Item5'),
        ],
      },
      {
        id: 3,
        icon: CreditCard,
        color: '#F59E0B',
        bg: 'rgba(245,158,11,0.12)',
        title: t('menuGuideChat.section3Title'),
        items: [
          t('menuGuideChat.section3Item1'),
          t('menuGuideChat.section3Item2'),
          t('menuGuideChat.section3Item3'),
        ],
      },
      {
        id: 4,
        icon: Star,
        color: '#E1306C',
        bg: 'rgba(225,48,108,0.12)',
        title: t('menuGuideChat.section4Title'),
        items: [
          t('menuGuideChat.section4Item1'),
          t('menuGuideChat.section4Item2'),
          t('menuGuideChat.section4Item3'),
        ],
      },
    ],
    [t]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: makeId(),
      role: 'bot',
      text: t('menuGuideChat.initialBotMessage'),
    },
  ]);

  const quickHints = useMemo(
    () => [
      t('menuGuideChat.quickHint1'),
      t('menuGuideChat.quickHint2'),
      t('menuGuideChat.quickHint3'),
    ],
    [t]
  );

  const respond = (text: string) => {
    const lower = text.toLowerCase();

    if (lower.includes('qr') || lower.includes('төле') || lower.includes('payment')) {
      return t('menuGuideChat.respondPayment');
    }

    if (lower.includes('тапсы') || lower.includes('заказ') || lower.includes('беру')) {
      return t('menuGuideChat.respondOrder');
    }

    if (lower.includes('жүргіз') || lower.includes('driver') || lower.includes('қабыл')) {
      return t('menuGuideChat.respondDriver');
    }

    return t('menuGuideChat.respondDefault');
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: 'user', text },
      { id: makeId(), role: 'bot', text: respond(text) },
    ]);

    setInput('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={['#B8860B', '#DAA520', '#FFD700']} style={styles.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('menuGuideChat.headerTitle')}</Text>
          <View style={styles.headerSubRow}>
            <MessageCircle size={16} color="rgba(255,255,255,0.45)" />
            <Text style={styles.headerSubtitle}>{t('menuGuideChat.headerSubtitle')}</Text>
          </View>
        </View>

        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          {t('menuGuideChat.intro')}
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
                {isOpen ? (
                  <ChevronUp size={18} color="rgba(255,255,255,0.4)" />
                ) : (
                  <ChevronDown size={18} color="rgba(255,255,255,0.4)" />
                )}
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

        <View style={styles.chatCard}>
          <Text style={styles.chatTitle}>{t('menuGuideChat.chatTitle')}</Text>

          <View style={styles.quickHintsRow}>
            {quickHints.map((h) => (
              <TouchableOpacity
                key={h}
                style={styles.quickHint}
                activeOpacity={0.75}
                onPress={() => setInput(h)}
              >
                <Text style={styles.quickHintText} numberOfLines={1}>
                  {h}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.messages}>
            {messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.messageRow,
                  m.role === 'user' ? styles.messageRowUser : styles.messageRowBot,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    m.role === 'user' ? styles.bubbleUser : styles.bubbleBot,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot,
                    ]}
                  >
                    {m.text}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t('menuGuideChat.inputPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.input}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} activeOpacity={0.85} onPress={send}>
              <Send size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 12 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { ...StyleSheet.absoluteFill },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.45)',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
  intro: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
    marginBottom: 18,
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
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNumText: { fontSize: 13, fontFamily: 'Inter-Bold' },
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
  stepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  chatCard: {
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  chatTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#FFFFFF', marginBottom: 12 },
  quickHintsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  quickHint: {
    backgroundColor: 'rgba(37,99,235,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  quickHintText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    maxWidth: 240,
  },
  messages: {
    minHeight: 120,
    maxHeight: 240,
    paddingVertical: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowBot: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '84%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  bubbleUser: {
    backgroundColor: 'rgba(37,99,235,0.25)',
    borderColor: 'rgba(37,99,235,0.55)',
  },
  bubbleBot: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  bubbleText: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 18 },
  bubbleTextUser: { color: '#FFFFFF' },
  bubbleTextBot: { color: 'rgba(255,255,255,0.8)' },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
    marginTop: 12,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: '#FFFFFF',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

