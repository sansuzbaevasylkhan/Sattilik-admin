'use client';

import React, { useState } from 'react';
import { Search, Send, MoreVertical, Phone, Video, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Mock data for users
const CONTACTS = [
  { id: 1, name: 'Асхат (Жүргізуші)', lastMsg: 'Сапарды аяқтадым', time: '10:25', unread: 2, type: 'driver', online: true },
  { id: 2, name: 'Динара (Жолаушы)', lastMsg: 'Күтіп тұрмын, қайдасыз?', time: '09:15', unread: 0, type: 'passenger', online: false },
  { id: 3, name: 'Арман (Жүргізуші)', lastMsg: 'Машина дайын', time: 'Кеше', unread: 0, type: 'driver', online: true },
  { id: 4, name: 'Әлия (Жолаушы)', lastMsg: 'Рахмет, бәрі жақсы болды', time: 'Кеше', unread: 0, type: 'passenger', online: false },
];

// Mock data for messages
const INITIAL_MESSAGES = [
  { id: 1, text: 'Сәлеметсіз бе!', sender: 'other', time: '10:00' },
  { id: 2, text: 'Сәлеметсіз бе, сапарға шықтыңыз ба?', sender: 'me', time: '10:01' },
  { id: 3, text: 'Иә, жолдамын, 5 минуттан кейін жетемін', sender: 'other', time: '10:05' },
  { id: 4, text: 'Жақсы, күтемін', sender: 'me', time: '10:06' },
  { id: 5, text: 'Сапарды аяқтадым', sender: 'other', time: '10:25' },
];

export default function ChatPage() {
  const [selectedContact, setSelectedContact] = useState(CONTACTS[0]);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setMessages([...messages, {
      id: Date.now(),
      text: inputValue,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setInputValue('');
  };

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
          {CONTACTS.map((contact) => (
            <div
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={cn(
                "flex items-center gap-3 p-4 cursor-pointer transition-all border-b border-sidebar-border/50 hover:bg-sidebar-accent/30",
                selectedContact.id === contact.id ? "bg-sidebar-accent/50 border-l-4 border-l-primary" : ""
              )}
            >
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white font-bold">
                  {contact.name[0]}
                </div>
                {contact.online && (
                  <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold truncate">{contact.name}</span>
                  <span className="text-[10px] text-muted-foreground">{contact.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground truncate">{contact.lastMsg}</p>
                  {contact.unread > 0 && (
                    <span className="h-5 w-5 bg-primary text-black text-[10px] font-bold flex items-center justify-center rounded-full">
                      {contact.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side: Chat Window */}
      <div className="hidden md:flex flex-1 flex-col bg-background">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-sidebar-border px-6 flex items-center justify-between bg-sidebar/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white font-bold">
                  {selectedContact.name[0]}
                </div>
                <div>
                  <h2 className="font-semibold">{selectedContact.name}</h2>
                  <p className="text-xs text-green-500">{selectedContact.online ? 'Онлайн' : 'Офлайн'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <Video className="h-5 w-5 cursor-pointer hover:text-primary transition-colors" />
                <Phone className="h-5 w-5 cursor-pointer hover:text-primary transition-colors" />
                <MoreVertical className="h-5 w-5 cursor-pointer hover:text-primary transition-colors" />
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0b141a] custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28128478-d87777f5-5538-11e8-899e-826392730110.png")', backgroundBlendMode: 'overlay' }}>
              {messages.map((msg) => (
                <div key={msg.id} className={cn(
                  "flex w-full",
                  msg.sender === 'me' ? "justify-end" : "justify-start"
                )}>
                  <div className={cn(
                    "max-w-[70%] px-4 py-2 rounded-2xl shadow-sm relative",
                    msg.sender === 'me'
                      ? "bg-[#005c4b] text-white rounded-tr-none"
                      : "bg-sidebar-foreground/10 text-foreground rounded-tl-none"
                  )}>
                    <p className="text-sm">{msg.text}</p>
                    <span className={cn(
                      "text-[10px] block text-right mt-1",
                      msg.sender === 'me' ? "text-green-200" : "text-muted-foreground"
                    )}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
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
