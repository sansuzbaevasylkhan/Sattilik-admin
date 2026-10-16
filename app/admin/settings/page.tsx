'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Save } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Қолданба параметрлері</h1>
        <Button className="gap-2">
          <Save className="h-4 w-4" /> Сақтау
        </Button>
      </div>
      <Card className="p-6 space-y-4">
        <p className="text-muted-foreground">Жүйе параметрлері осы жерде орналасады.</p>
        <div className="grid gap-4">
           <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>Валюта: <b>KZT</b></span>
              <Button variant="outline" size="sm">Өзгерту</Button>
           </div>
           <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>Уақыт белдеуі: <b>Asia/Almaty</b></span>
              <Button variant="outline" size="sm">Өзгерту</Button>
           </div>
        </div>
      </Card>
    </div>
  );
}
