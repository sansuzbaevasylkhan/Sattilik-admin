
'use client';

import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Leaflet marker icon fix
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl:
    'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

interface Driver {
  phone: string;
  lat: number;
  lng: number;
  last_updated: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  status?: string;
}

// Map recenter component
function MapRecenter({
  coords,
}: {
  coords: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (coords) {
      map.setView(coords, 13);
    }
  }, [coords, map]);

  return null;
}

export default function AdminMapPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] =
    useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Fetch online drivers
    const fetchDrivers = async () => {
      try {
        setFetchError(null);

        const { data, error } = await supabase
          .from('driver_locations')
          .select('phone, lat, lng, updated_at')
          .gte('updated_at', new Date(Date.now() - 2 * 60 * 1000).toISOString());

        if (error) {
          throw error;
        }

        // Fetch driver information
        const { data: users, error: usersError } =
          await supabase
            .from('users')
            .select('phone, first_name, last_name, role')
            .eq('role', 'driver');

        if (usersError) {
          throw usersError;
        }

        if (!mounted) return;

        const enrichedDrivers: Driver[] = (data || []).map(
          (location) => {
            const user = users?.find(
              (u) => u.phone === location.phone
            );

            return {
              ...location,
              first_name: user?.first_name || 'Жүргізуші',
              last_name: user?.last_name || '',
              role: user?.role,
            };
          }
        );

        setDrivers(enrichedDrivers);
      } catch (error) {
        console.error('Drivers fetch error:', error);

        if (mounted) {
          setFetchError(
            error instanceof Error
              ? error.message
              : 'Деректерді жүктеу қатесі'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchDrivers();

    // Realtime subscription
    const channel = supabase
      .channel('admin-driver-locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_locations',
        },
        (payload) => {
          if (!mounted) return;

          if (payload.eventType === 'DELETE') {
            setDrivers((prev) =>
              prev.filter(
                (driver) =>
                  driver.phone !== payload.old.phone
              )
            );

            return;
          }

          const updated = payload.new as Partial<Driver>;

          setDrivers((prev) => {
            const index = prev.findIndex(
              (driver) => driver.phone === updated.phone
            );

            // New online driver
            if (index === -1) {
              if (updated.status !== 'online') return prev;

              fetchDrivers();
              return prev;
            }

            if (updated.status && updated.status !== 'online') {
              return prev.filter(
                (driver) => driver.phone !== updated.phone
              );
            }

            const next = [...prev];

            next[index] = {
              ...next[index],
              ...updated,
            };

            return next;
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const validDrivers = drivers.filter(
    (driver) =>
      Number.isFinite(Number(driver.lat)) &&
      Number.isFinite(Number(driver.lng))
  );

  return (
    <div className="flex h-screen w-full bg-slate-950 text-white overflow-hidden">

      {/* Sidebar */}
      <div className="w-80 h-full bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto z-10">

        <h1 className="text-xl font-bold mb-6 text-yellow-500">
          Мониторинг
        </h1>

        {/* Statistics */}
        <div className="space-y-4">

          <Card className="bg-slate-800 border-slate-700 p-4 text-white">
            <p className="text-sm opacity-60">
              Онлайн жүргізушілер
            </p>

            <p className="text-3xl font-bold">
              {validDrivers.length}
            </p>
          </Card>

          {/* Driver List */}
          <div className="space-y-2">

            <p className="text-xs font-semibold uppercase opacity-40 px-2">
              Тізім
            </p>

            {loading && (
              <p className="text-sm text-slate-400 p-3">
                Жүктелуде...
              </p>
            )}

            {fetchError && (
              <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 text-sm text-red-300">
                Қате: {fetchError}
              </div>
            )}

            {!loading && !fetchError && validDrivers.length === 0 && (
              <p className="text-sm text-slate-400 p-3">
                Онлайн жүргізушілер жоқ
              </p>
            )}

            {validDrivers.map((driver) => (
              <div
                key={driver.phone}
                onClick={() => setSelectedDriver(driver)}
                className={`p-3 rounded-xl cursor-pointer transition-all ${
                  selectedDriver?.phone === driver.phone
                    ? 'bg-yellow-500 text-black'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                <div className="flex justify-between items-center">

                  <span className="font-medium">
                    {driver.first_name} {driver.last_name}
                  </span>

                  <Badge
                    variant="outline"
                    className={
                      selectedDriver?.phone === driver.phone
                        ? 'text-black'
                        : 'text-white'
                    }
                  >
                    Online
                  </Badge>

                </div>

                <p className="text-xs opacity-60 mt-1">
                  {driver.phone}
                </p>
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
          style={{
            height: '100%',
            width: '100%',
          }}
        >

          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {/* Driver Markers */}
          {validDrivers.map((driver) => (
            <Marker
              key={driver.phone}
              position={[
                Number(driver.lat),
                Number(driver.lng),
              ]}
              eventHandlers={{
                click: () => setSelectedDriver(driver),
              }}
            >
              <Popup>
                <div className="text-slate-900 p-1">

                  <p className="font-bold">
                    {driver.first_name} {driver.last_name}
                  </p>

                  <p className="text-xs">
                    {driver.phone}
                  </p>

                </div>
              </Popup>
            </Marker>
          ))}

          {/* Recenter map */}
          {selectedDriver && (
            <MapRecenter
              coords={[
                Number(selectedDriver.lat),
                Number(selectedDriver.lng),
              ]}
            />
          )}

        </MapContainer>

        {/* Driver Details */}
        {selectedDriver && (
          <div className="absolute bottom-8 left-8 right-8 md:left-auto md:right-8 md:w-96 z-[1000]">

            <Card className="bg-slate-900/90 backdrop-blur-md border-yellow-500/30 p-6 text-white shadow-2xl">

              <div className="flex justify-between items-start mb-4">

                <div>
                  <h2 className="text-xl font-bold">
                    {selectedDriver.first_name}{' '}
                    {selectedDriver.last_name}
                  </h2>

                  <p className="text-sm opacity-60">
                    {selectedDriver.phone}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedDriver(null)}
                  className="text-slate-400 hover:text-white"
                  aria-label="Жабу"
                >
                  ✕
                </button>

              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">

                <div className="bg-slate-800 p-3 rounded-lg">
                  <p className="opacity-50">
                    Статусы
                  </p>

                  <p className="font-semibold text-green-400">
                    Белсенді
                  </p>
                </div>

                <div className="bg-slate-800 p-3 rounded-lg">
                  <p className="opacity-50">
                    Соңғы жаңарту
                  </p>

                  <p className="font-semibold">
                    {selectedDriver.last_updated
                      ? new Date(
                          selectedDriver.last_updated
                        ).toLocaleTimeString()
                      : 'Белгісіз'}
                  </p>
                </div>

              </div>

            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
