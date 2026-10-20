'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, BellRing, BellOff, Send } from 'lucide-react';
import { toast } from 'sonner'; // Assuming sonner or a similar toast library is used

export default function NotificationsPage() {
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default'>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Браузеріңіз хабарландыруларды қолдамайды');
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      toast.success('Push-хабарландырулар қосылды!');
      registerServiceWorker();
    } else {
      toast.error('Хабарландыруларға рұқсат берілмеді');
    }
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker тіркелді:', registration);
    } catch (error) {
      console.error('Service Worker қатесі:', error);
    }
  };

  const sendTestNotification = () => {
    if (permission !== 'granted') {
      toast.error('Алдымен хабарландыруларға рұқсат беріңіз');
      return;
    }

    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification('Sattilik Панель', {
        body: 'Бұл тесттік push-хабарлама! 🚀',
        icon: '/logo.png',
      });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Push Хабарландырулар</h1>
          <p className="text-muted-foreground">Браузер арқылы хабарламалар алуды басқарыңыз</p>
        </div>
        <div className="flex gap-2">
          {permission === 'granted' ? (
            <Button variant="outline" className="gap-2" onClick={sendTestNotification}>
              <Send className="h-4 w-4" /> Тест жіберу
            </Button>
          ) : (
            <Button className="gap-2" onClick={requestPermission}>
              <BellRing className="h-4 w-4" /> Хабарламаларды қосу
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${permission === 'granted' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
              {permission === 'granted' ? <Bell className="h-6 w-6" /> : <BellOff className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="font-semibold text-lg">Күй: {
                permission === 'granted' ? 'Белсенді' :
                permission === 'denied' ? 'Блоктаулы' : 'Белгісіз'
              }</h3>
              <p className="text-sm text-muted-foreground">
                {permission === 'granted'
                  ? 'Сіз жаңа оқиғалар туралы хабарлама аласыз.'
                  : 'Хабарламалар алу үшін рұқсат беріңіз.'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-lg">Нұсқаулық</h3>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4">
            <li>"Хабарламаларды қосу" батырмасын басыңыз.</li>
            <li>Браузердің жоғарғы бөлігіндегі рұқсат сұранысына "Allow" (Рұқсат беру) деп жауап беріңіз.</li>
            <li>"Тест жіберу" батырмасы арқылы жұмыс істейтінін тексеріңіз.</li>
          </ul>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card className="p-6 text-center text-muted-foreground border-dashed">
          Хабарландырулар тарихы әзірленуде...
        </Card>
      </div>
    </div>
  );
}
