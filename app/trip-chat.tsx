import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Phone, Send } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getUser } from '@/store/userStore';
import { useTranslation } from '@/hooks/useTranslation';
import { BG_GRADIENT, BG_DARK, BG_MID, BG_DEEP } from '@/lib/theme';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

type ChatMessage = {
  id: string;
  trip_id: string;
  sender_id: string;
  sender_phone: string;
  text: string;
  created_at: string;
};

export default function TripChatScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ orderId?: string; peerName?: string; peerPhone?: string }>();
  const orderId = typeof params.orderId === 'string' ? params.orderId : '';
  const peerName = typeof params.peerName === 'string' ? params.peerName : t('tripChat.title');
  const peerPhone = typeof params.peerPhone === 'string' ? params.peerPhone : '';
  const myPhone = getUser().phone;
  const chatAccessToken = getUser().chatAccessToken;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const requestChat = useCallback(async (action: 'list' | 'send', text?: string) => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/trip-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'x-chat-session': chatAccessToken,
      },
      body: JSON.stringify({ action, orderId, ...(text ? { text } : {}) }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Chat request failed');
    return payload as { messages?: ChatMessage[]; message?: ChatMessage };
  }, [chatAccessToken, orderId]);

  const loadMessages = useCallback(async () => {
    if (!orderId || !myPhone) {
      setFailed(true);
      setLoading(false);
      return;
    }
    try {
      const result = await requestChat('list');
      setMessages(result.messages || []);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [myPhone, orderId, requestChat]);

  useEffect(() => {
    const initialLoad = setTimeout(() => { void loadMessages(); }, 0);
    const interval = setInterval(() => { void loadMessages(); }, 3000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadMessages]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const result = await requestChat('send', text);
      setDraft('');
      if (result.message) setMessages((current) => [...current, result.message!]);
      else await loadMessages();
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch {
      Alert.alert(t('common.error'), t('tripChat.sendError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={BG_GRADIENT} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} accessibilityLabel={t('common.back')}>
          <ArrowLeft size={22} color="#FFD700" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>{peerName}</Text>
          <Text style={styles.subtitle}>{t('tripChat.title')}</Text>
        </View>
        {peerPhone ? (
          <TouchableOpacity style={styles.callButton} onPress={() => Linking.openURL(`tel:${peerPhone}`)} accessibilityRole="button">
            <Phone size={20} color="#111111" />
          </TouchableOpacity>
        ) : <View style={styles.callPlaceholder} />}
      </View>

      {failed ? <Text style={styles.error}>{t('tripChat.loadError')}</Text> : null}
      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#FFD700" /></View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.messageList, messages.length === 0 && styles.emptyList]}
          renderItem={({ item }) => {
            const mine = item.sender_phone === myPhone;
            return (
              <View style={[styles.messageRow, mine ? styles.mineRow : styles.theirRow]}>
                <View style={[styles.bubble, mine ? styles.mineBubble : styles.theirBubble]}>
                  <Text style={[styles.messageText, mine && styles.mineMessageText]}>{item.text}</Text>
                  <Text style={[styles.time, mine && styles.mineTime]}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={!failed ? <Text style={styles.emptyText}>{t('tripChat.empty')}</Text> : undefined}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={t('tripChat.inputPlaceholder')}
          placeholderTextColor="rgba(255,255,255,0.45)"
          multiline
          maxLength={1000}
          editable={!sending && !failed}
        />
        <TouchableOpacity style={[styles.sendButton, (!draft.trim() || sending || failed) && styles.sendDisabled]} onPress={sendMessage} disabled={!draft.trim() || sending || failed} accessibilityLabel={t('tripChat.send')}>
          {sending ? <ActivityIndicator size="small" color="#111111" /> : <Send size={18} color="#111111" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_DARK },
  header: { paddingTop: Platform.OS === 'web' ? 24 : 54, paddingHorizontal: 18, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: BG_MID, borderBottomWidth: 1, borderBottomColor: 'rgba(255,215,0,0.25)' },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: BG_DEEP },
  headerText: { flex: 1, marginHorizontal: 12 },
  title: { color: '#FFFFFF', fontSize: 17, fontFamily: 'Inter-SemiBold' },
  subtitle: { color: '#FFD700', fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },
  callButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD700' },
  callPlaceholder: { width: 42 },
  error: { color: '#FFB4AB', paddingHorizontal: 20, paddingTop: 10, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messageList: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14, flexGrow: 1 },
  emptyList: { justifyContent: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontFamily: 'Inter-Regular' },
  messageRow: { width: '100%', marginBottom: 10, flexDirection: 'row' },
  mineRow: { justifyContent: 'flex-end' },
  theirRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 7 },
  mineBubble: { backgroundColor: '#FFD700', borderBottomRightRadius: 5 },
  theirBubble: { backgroundColor: '#292929', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)' },
  messageText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter-Regular' },
  mineMessageText: { color: '#111111' },
  time: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontFamily: 'Inter-Regular', alignSelf: 'flex-end', marginTop: 5 },
  mineTime: { color: 'rgba(0,0,0,0.55)' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 14, paddingTop: 10, paddingBottom: Platform.OS === 'web' ? 14 : 24, backgroundColor: BG_MID, borderTopWidth: 1, borderTopColor: 'rgba(255,215,0,0.2)' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, backgroundColor: BG_DEEP, color: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, fontSize: 15, fontFamily: 'Inter-Regular' },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD700' },
  sendDisabled: { opacity: 0.5 },
});
