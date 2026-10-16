'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCog, Plus } from 'lucide-react';

export default function AdminsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Әкімшілер</h1>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Әкімші қосу
        </Button>
      </div>
      <div className="grid gap-4">
        <Card className="p-6 text-center text-muted-foreground border-dashed">
          Әкімшілер тізімі және рұқсаттар әзірленуде...
        </Card>
      </div>
    </div>
  );
}
