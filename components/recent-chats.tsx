'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface RecentChat {
  id: string;
  full_name: string;
  last_msg: string;
  last_msg_time: string;
  unread_count: number;
}

export function RecentChats() {
  const [chats, setChats] = useState<RecentChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentChats = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            user_id,
            content,
            created_at,
            is_read,
            users (full_name)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const grouped = data.reduce((acc: any, msg: any) => {
          const userId = msg.user_id;
          if (!acc[userId]) {
            acc[userId] = {
              id: userId,
              full_name: msg.users?.full_name || 'Белгісіз',
              last_msg: msg.content,
              last_msg_time: msg.created_at,
              unread_count: 0,
            };
          }
          return acc;
        }, {});

        // Оқылмаған хаттарды есептеу
        for (const userId in grouped) {
          const unread = data.filter((m: any) =>
            m.user_id === userId && m.sender_role === 'client' && !m.is_read
          ).length;
          grouped[userId].unread_count = unread;
        }

        setChats(Object.values(grouped).slice(0, 5));
      } catch (err) {
        console.error('Fetch chats error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentChats();
  }, []);

  if (isLoading) return <div className="h-full w-full animate-pulse bg-muted rounded-xl" />;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Жедел чаттар
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/chat" className="text-xs">Барлығы →</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {chats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Жаңа хабарламалар жоқ</p>
        ) : (
          <div className="space-y-3">
            {chats.map((chat) => (
              <Link
                key={chat.id}
                href={`/admin/chat?user_id=${chat.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-//border hover:bg-accent transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {chat.full_name[0]}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">{chat.full_name}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">{chat.last_msg}</span>
                  </div>
                </div>
                {chat.unread_count > 0 && (
                  <span className="h-5 w-5 bg-primary text-black text-[10px] font-bold flex items-center justify-center rounded-full">
                    {chat.unread_count}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
