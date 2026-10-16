'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, RefreshCw } from 'lucide-react';

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Әрекеттер журналы</h1>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Жаңарту
        </Button>
      </div>
      <div className="grid gap-4">
        <Card className="p-6 text-center text-muted-foreground border-dashed">
          Жүйелік журналдар әзірленуде...
        </Card>
      </div>
    </div>
  );
}
