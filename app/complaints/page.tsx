'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, Clock, UserX } from 'lucide-react'; // Fixed: use lucide-react instead of lucide-react-native

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [response, setResponse] = useState('');

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*, users!driver_id(first_name, last_name, phone)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (e) {
      console.error('Error fetching complaints:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedComplaint) return;
    try {
      const { error } = await supabase
        .from('complaints')
        .update({
          status: 'resolved',
          admin_response: response
        })
        .eq('id', selectedComplaint.id);

      if (error) throw error;

      setSelectedComplaint(null);
      setResponse('');
      fetchComplaints();
    } catch (e) {
      alert('Қателік орын алды');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <Badge className="bg-red-500">Жаңа</Badge>;
      case 'reviewing': return <Badge className="bg-blue-500">Қаралуда</Badge>;
      case 'resolved': return <Badge className="bg-green-500">Шешілді</Badge>;
      default: return <Badge>Белгісіз</Badge>;
    }
  };

  if (loading) return <div className="p-8 text-center text-white">Жүктелуде...</div>;

  return (
    <div className="flex h-screen w-full bg-slate-950 text-white p-8 overflow-hidden">
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Шағымдар және Бақылау</h1>
          <Button onClick={fetchComplaints} variant="outline" className="text-white border-slate-700">Жаңарту</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-900 border-slate-800 p-4">
            <p className="text-sm opacity-60">Барлық шағымдар</p>
            <p className="text-2xl font-bold">{complaints.length}</p>
          </Card>
          <Card className="bg-slate-900 border-slate-800 p-4">
            <p className="text-sm opacity-60">Шешілмеген</p>
            <p className="text-2xl font-bold text-red-400">
              {complaints.filter(c => c.status !== 'resolved').length}
            </p>
          </Card>
          <Card className="bg-slate-900 border-slate-800 p-4">
            <p className="text-sm opacity-60">Шешілгендер</p>
            <p className="text-2xl font-bold text-green-400">
              {complaints.filter(c => c.status === 'resolved').length}
            </p>
          </Card>
        </div>

        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex">
          {/* Complaint List */}
          <div className="w-1/3 border-r border-slate-800 overflow-y-auto">
            {complaints.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedComplaint(c)}
                className={`p-4 cursor-pointer border-b border-slate-800 transition-colors ${selectedComplaint?.id === c.id ? 'bg-yellow-500/10' : 'hover:bg-slate-800'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">{c.users?.first_name} {c.users?.last_name}</span>
                  {getStatusBadge(c.status)}
                </div>
                <p className="text-xs opacity-60 line-clamp-2">{c.text}</p>
              </div>
            ))}
          </div>

          {/* Complaint Detail */}
          <div className="flex-1 p-6 flex flex-col">
            {selectedComplaint ? (
              <div className="flex flex-col h-full">
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-2">Шағым мәліметтері</h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-slate-800 p-3 rounded-lg">
                      <p className="opacity-50">Жүргізуші</p>
                      <p className="font-semibold">{selectedComplaint.users?.first_name} {selectedComplaint.users?.last_name}</p>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-lg">
                      <p className="opacity-50">Телефон</p>
                      <p className="font-semibold">{selectedComplaint.users?.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-slate-800 p-4 rounded-xl mb-6">
                  <p className="text-xs uppercase opacity-40 mb-2">Шағым мәтіні</p>
                  <p className="text-lg leading-relaxed">{selectedComplaint.text}</p>
                </div>

                <div className="space-y-4">
                  <Textarea
                    placeholder="Админ жауабын жазыңыз..."
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-yellow-500 text-black hover:bg-yellow-600"
                      onClick={handleResolve}
                    >
                      Шешілді деп белгілеу
                    </Button>
                    <Button
                      variant="outline"
                      className="text-white border-slate-700"
                      onClick={() => setSelectedComplaint(null)}
                    >
                      Жабу
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                <AlertCircle size={48} />
                <p className="mt-4 text-lg">Шағымды көру үшін тізімнен таңдаңыз</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
