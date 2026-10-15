'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function MapRecenter({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView(coords, 13);
  }, [coords]);
  return null;
}

export default function AdminMapPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial fetch of all online drivers
    const fetchDrivers = async () => {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('phone, lat, lng, last_updated')
        .eq('status', 'online');

      if (!error && data) {
        // Join with users table to get names
        const { data: users } = await supabase
          .from('users')
          .select('phone, first_name, last_name, role')
          .eq('role', 'driver');

        const enrichedDrivers = data.map(loc => {
          const user = users?.find(u => u.phone === loc.phone);
          return { ...loc, ...user };
        });
        setDrivers(enrichedDrivers);
      }
      setLoading(false);
    };

    fetchDrivers();

    // 2. Realtime subscription to location updates
    const channel = supabase
      .channel('admin-driver-locations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'driver_locations',
        },
        (payload) => {
          setDrivers(prev => {
            const index = prev.findIndex(d => d.phone === payload.new.phone);
            if (index === -1) return prev;
            const next = [...prev];
            next[index] = { ...next[index], ...payload.new };
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex h-screen w-full bg-slate-950 text-white overflow-hidden">
      {/* Sidebar Info */}
      <div className="w-80 h-full bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto z-10">
        <h1 className="text-xl font-bold mb-6 text-yellow-500">Мониторинг</h1>

        <div className="space-y-4">
          <Card className="bg-slate-800 border-slate-700 p-4 text-white">
            <p className="text-sm opacity-60">Онлайн жүргізушілер</p>
            <p className="text-3xl font-bold">{drivers.length}</p>
          </Card>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase opacity-40 px-2">Тізім</p>
            {drivers.map(driver => (
              <div
                key={driver.phone}
                onClick={() => setSelectedDriver(driver)}
                className={`p-3 rounded-xl cursor-pointer transition-all ${selectedDriver?.phone === driver.phone ? 'bg-yellow-500 text-black' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{driver.first_name} {driver.last_name}</span>
                  <Badge variant="outline" className={selectedDriver?.phone === driver.//phone ? 'text-black' : 'text-white'}>
                    Online
                  </Badge>
                </div>
                <p className="text-xs opacity-60 mt-1">{driver.phone}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        <MapContainer
          center={[43.222, 76.851]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {drivers.map(driver => (
            <Marker
              key={driver.phone}
              position={[driver.lat, driver.lng]}
              eventHandlers={{ click: () => setSelectedDriver(driver) }}
            >
              <Popup>
                <div className="text-slate-900 p-1">
                  <p className="font-bold">{driver.first_name} {driver.last_name}</p>
                  <p className="text-xs">{driver.phone}</p>
                </div>
              </Popup>
            </Marker>
          ))}
          {selectedDriver && <MapRecenter coords={[selectedDriver.lat, selectedDriver.lng]} />}
        </MapContainer>

        {/* Driver Detail Card */}
        {selectedDriver && (
          <div className="absolute bottom-8 left-8 right-8 md:left-auto md:right-8 md:w-96 z-[1000]">
            <Card className="bg-slate-900/90 backdrop-blur-md border-yellow-500/30 p-6 text-white shadow-2xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">{selectedDriver.first_name} {selectedDriver.last_name}</h2>
                  <p className="text-sm opacity-60">{selectedDriver.phone}</p>
                </div>
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-800 p-3 rounded-lg">
                  <p className="opacity-50">Статусы</p>
                  <p className="font-semibold text-green-400">Белсенді</p>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg">
                  <p className="opacity-50">Соңғы жаңарту</p>
                  <p className="font-semibold">{new Date(selectedDriver.last_updated).toLocaleTimeString()}</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
