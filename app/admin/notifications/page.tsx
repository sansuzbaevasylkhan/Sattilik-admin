'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Search } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Хабарландырулар</h1>
        <Button className="gap-2">
          <Bell className="h-4 w-4" /> Жаңа хабарлама жіберу
        </Button>
      </div>
      <div className="grid gap-4">
        <Card className="p-6 text-center text-muted-foreground border-dashed">
          Хабарландырулар тізімі әзірленуде...
        </Card>
      </div>
    </div>
  );
}
