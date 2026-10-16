'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Plus } from 'lucide-react';

export default function AreasPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Қызмет аймақтары</h1>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Жаңа аймақ қосу
        </Button>
      </div>
      <div className="grid gap-4">
        <Card className="p-6 text-center text-muted-foreground border-dashed">
          Аймақтар картасы және тізімі әзірленуде...
        </Card>
      </div>
    </div>
  );
}
