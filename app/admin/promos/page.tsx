'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ticket, Plus } from 'lucide-react';

export default function PromosPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Промокодтар</h1>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Жаңа промокод қосу
        </Button>
      </div>
      <div className="grid gap-4">
        <Card className="p-6 text-center text-muted-foreground border-dashed">
          Промокодтар тізімі әзірленуде...
        </Card>
      </div>
    </div>
  );
}
