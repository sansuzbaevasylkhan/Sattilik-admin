'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Wallet, Clock, MapPin, Zap } from 'lucide-react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTariff, setEditingTariff] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchTariffs();
  }, []);

  const fetchTariffs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tariffs')
        .select('*')
        .order('name');
      if (error) throw error;
      setTariffs(data || []);
    } catch (e) {
      console.error('Error fetching tariffs:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tariff: any) => {
    setEditingTariff(tariff);
    setFormData({ ...tariff });
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('tariffs')
        .upsert({
          id: editingTariff?.id,
          ...formData,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      setEditingTariff(null);
      fetchTariffs();
    } catch (e) {
      alert('Сақтау кезінде қате кетті');
    }
  };

  if (loading) return <div className="p-8 text-center text-white">Жүктелуде...</div>;

  return (
    <div className="flex h-screen w-full bg-slate-950 text-white p-8 overflow-hidden">
      <div className="flex-1 flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Тарифтерді басқару</h1>
          <Button
            onClick={() => {
              setEditingTariff({ name: '' });
              setFormData({ name: '', base_price: 0, price_per_km: 0, price_per_minute: 0, night_multiplier: 1, surge_multiplier: 1, night_start: '22:00', night_end: '06:00', is_active: true });
            }}
            className="bg-yellow-500 text-black hover:bg-yellow-600"
          >
            Жаңа тариф қосу
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tariffs List */}
          <div className="lg:col-span-1 space-y-4">
            {tariffs.map(t => (
              <Card
                key={t.id}
                className={`p-4 cursor-pointer transition-all ${editingTariff?.id === t.id ? 'bg-yellow-500 text-black' : 'bg-slate-900 border-slate-800 text-white'}`}
                onClick={() => handleEdit(t)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">{t.name}</span>
                  <Badge variant={t.is_active ? 'default' : 'destructive'}>
                    {t.is_active ? 'Белсенді' : 'Өшірілген'}
                  </Badge>
                </div>
                <div className="mt-2 text-sm opacity-70">
                  Базалық баға: {t.base_price} ₸
                </div>
              </Card>
            ))}
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            {editingTariff ? (
              <Card className="bg-slate-900 border-slate-800 p-6 text-white">
                <h2 className="text-xl font-bold mb-6">Тарифті өңдеу: {formData.name}</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-400">Тариф атауы</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="bg-slate-950 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400">Базалық баға (₸)</Label>
                    <Input
                      type="number"
                      value={formData.base_price}
                      onChange={(e) => setFormData({...formData, base_price: parseFloat(e.target.value)})}
                      className="bg-slate-950 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400">1 км құны (₸)</Label>
                    <Input
                      type="number"
                      value={formData.price_per_km}
                      onChange={(e) => setFormData({...formData, price_per_km: parseFloat(e.target.value)})}
                      className="bg-slate-950 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400">1 мин құны (₸)</Label>
                    <Input
                      type="number"
                      value={formData.price_per_minute}
                      onChange={(e) => setFormData({...formData, price_per_minute: parseFloat(e.target.value)})}
                      className="bg-slate-950 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400">Түнгі коэффициент</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.night_multiplier}
                      onChange={(e) => setFormData({...formData, night_multiplier: parseFloat(e.target.value)})}
                      className="bg-slate-950 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400">Сұраныс коэффициенті</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.surge_multiplier}
                      onChange={(e) => setFormData({...formData, surge_multiplier: parseFloat(e.target.value)})}
                      className="bg-slate-950 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400">Түнгі уақыт басталуы</Label>
                    <Input
                      type="time"
                      value={formData.night_start}
                      onChange={(e) => setFormData({...formData, night_start: e.target.value})}
                      className="bg-slate-950 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400">Түнгі уақыт аяқталуы</Label>
                    <Input
                      type="time"
                      value={formData.night_end}
                      onChange={(e) => setFormData({...formData, night_end: e.target.value})}
                      className="bg-slate-950 border-slate-700 text-white"
                    />
                  </div>
                </div>
                <div className="mt-8 flex gap-3">
                  <Button
                    className="flex-1 bg-yellow-500 text-black hover:bg-yellow-600"
                    onClick={handleSave}
                  >
                    Сақтау
                  </Button>
                  <Button
                    variant="outline"
                    className="text-white border-slate-700"
                    onClick={() => setEditingTariff(null)}
                  >
                    Бас тарту
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30">
                <Wallet size={64} />
                <p className="mt-4 text-xl">Өңдеу үшін тарифті таңдаңыз</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
