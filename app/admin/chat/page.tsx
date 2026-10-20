'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Search, Send, MoreVertical, Phone, Video, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface Message {
  id: string;
  user_id: string;
  sender_role: 'client' | 'admin';
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Contact {
  id: string;
  full_name: string;
  phone: string;
  last_msg?: string;
  last_msg_time?: string;
  unread_count: number;
  role: string;
}

export default function ChatPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Сөйлесушілер тізімін жүктеу (Клиенттер бойынша топтасқан)
  const fetchContacts = async () => {
    try {
      // messages және users кестесінен деректерді аламыз
      const { data, error } = await supabase
        .from('messages')
        .select(`
          user_id,
          content,
          created_at,
          is_read,
          users (
            id,
            full_name,
            phone,
            role
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const grouped = data.reduce((acc: any, msg: any) => {
        const userId = msg.user_id;
        const user = msg.users;
        if (!acc[userId]) {
          acc[userId] = {
            id: userId,
            full_name: user?.full_name || 'Белгісіз қолданушы',
            phone: user?.phone || '',
            role: user?.role || 'client',
            last_msg: msg.content,
            last_msg_time: msg.created_at,
            unread_count: 0,
          };
        }
        if (!acc[userId].last_msg_time || new Date(msg.created_at) > new Date(acc[userId].last_msg_time)) {
          acc[userId].last_msg = msg.content;
          acc[userId].last_msg_time = msg.created_at;
        }
        return acc;
      }, {});

      // Оқылмаған хаттар санын есептеу
      for (const userId in grouped) {
        const unread = data.filter((m: any) =>
          m.user_id === userId && m.sender_role === 'client' && !m.is_read
        ).length;
        grouped[userId].unread_count = unread;
      }

      setContacts(Object.values(grouped));
    } catch (err) {
      console.error('Contacts fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Таңдалған клиенттің хабарламаларын жүктеу
  const fetchMessages = async (userId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Messages fetch error:', error);
      return;
    }
    setMessages(data || []);

    // Чат ашылғанда клиент хабарламаларын оқылды деп белгілеу
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  };

  // 3. Realtime Subscription (Supabase Postgres Changes)
  useEffect(() => {
    fetchContacts();

    const channel = supabase
      .channel('admin-chat-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as Message;

          // Тізімді жаңарту (соңғы хабарлама және оқылмаған саны үшін)
          fetchContacts();

          // Егер осы чат ашық болса, хабарламаны тізімге қосу
          if (selectedContact && newMessage.user_id === selectedContact.id) {
            setMessages(prev => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedContact]);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.id);
    }
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !selectedContact) return;

    const content = inputValue;
    setInputValue('');

    // Optimistic Update: Хабарламаны бірден көрсету
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      user_id: selectedContact.id,
      sender_role: 'admin',
      content: content,
      is_read: true,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    const { error } = await supabase
      .from('messages')
      .insert([{
        user_id: selectedContact.id,
        sender_role: 'admin',
        content: content,
      }]);

    if (error) {
      console.error('Send error:', error);
      // Қате болса, optimistic хабарламаны алып тастау немесе қате көрсету
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-background text-foreground overflow-hidden border rounded-xl m-4 shadow-2xl border-sidebar-border">
      {/* Left Sidebar: Contact List */}
      <div className="w-full md:w-96 border-r border-sidebar-border flex flex-col bg-sidebar/30">
        <div className="p-4 border-b border-sidebar-border space-y-4 bg-sidebar/50">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-primary">Чаттар</h1>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="rounded-full">
                <UserCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Іздеу..."
              className="pl-9 bg-background/50 border-none focus-visible:ring-1 ring-[#D4AF37]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {contacts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Әзірше сөйлесулер жоқ
            </div>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={cn(
                  "flex items-center gap-3 p-4 cursor-pointer transition-all border-b border-sidebar-border/50 hover:bg-sidebar-accent/30",
                  selectedContact?.id === contact.id ? "bg-sidebar-accent/50 border-l-4 border-l-primary" : ""
                )}
              >
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white font-bold">
                    {contact.full_name[0]}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold truncate">{contact.full_name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {contact.last_msg_time ? new Date(contact.last_msg_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground truncate">{contact.last_msg}</p>
                    {contact.unread_count > 0 && (
                      <span className="h-5 w-5 bg-primary text-black text-[10px] font-bold flex items-center justify-center rounded-full">
                        {contact.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Side: Chat Window */}
      <div className="hidden md:flex flex-1 flex-col bg-background">
        {selectedContact ? (
          <>
            <div className="h-16 border-b border-sidebar-border px-6 flex items-center justify-between bg-sidebar/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white font-bold">
                  {selectedContact.full_name[0]}
                </div>
                <div>
                  <h2 className="font-semibold">{selectedContact.full_name}</h2>
                  <p className="text-xs text-muted-foreground">{selectedContact.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <Video className="h-5 w-5 cursor-pointer hover:text-primary transition-colors" />
                <Phone className="h-5 w-5 cursor-pointer hover:text-primary transition-colors" />
                <MoreVertical className="h-5 w-5 cursor-pointer hover:text-primary transition-colors" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0b141a] custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28128478-d87777f5-5538-11e8-899e-826392730110.png")', backgroundBlendMode: 'overlay' }}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground italic">
                  Хабарламалар жоқ. Сөйлесуді бастаңыз!
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={cn(
                    "flex w-full",
                    msg.sender_role === 'admin' ? "justify-end" : "justify-start"
                  )}>
                    <div className={cn(
                      "max-w-[70%] px-4 py-2 rounded-2xl shadow-sm relative",
                      msg.sender_role === 'admin'
                        ? "bg-[#005c4b] text-white rounded-tr-none"
                        : "bg-sidebar-foreground/10 text-foreground rounded-tl-none"
                    )}>
                      <p className="text-sm">{msg.content}</p>
                      <span className={cn(
                        "text-[10px] block text-right mt-1",
                        msg.sender_role === 'admin' ? "text-green-200" : "text-muted-foreground"
                      )}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-sidebar/20 border-t border-sidebar-border flex items-center gap-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Хабарлама жазыңыз..."
                className="flex-1 bg-background border-none focus-visible:ring-0 py-6 px-4"
              />
              <Button type="submit" size="icon" className="rounded-full h-12 w-12">
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <div className="h-24 w-24 bg-sidebar-accent/20 rounded-full flex items-center justify-center mb-4">
              <UserCircle className="h-12 w-12" />
            </div>
            <h2 className="text-2xl font-semibold">Сөйлесуді бастаңыз</h2>
            <p className="max-w-sm mt-2">Жолаушылармен немесе жүргізушілермен байланысу үшін сол жақ тізімнен біреуін таңдаңыз.</p>
          </div>
        )}
      </div>
    </div>
  );
}
