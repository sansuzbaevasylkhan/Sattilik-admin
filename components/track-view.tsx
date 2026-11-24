'use client';

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Leaflet
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface TripStatus {
  order: { dropoff_address: string };
  driver: { first_name: string; last_name: string };
  location: { lat: number; lng: number } | null;
}

export default function TrackTrip({ token }: { token: string }) {
  const [data, setData] = useState<TripStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-trip-status?token=${encodeURIComponent(token)}`);
        if (!res.ok) throw new Error('Сілтеме жарамсыз немесе мерзімі өткен');
        const json = await res.json() as TripStatus;
        setData(json);
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : 'Сапар мәліметін жүктеу мүмкін болмады');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [token]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-background text-foreground">Жүктелуде...</div>;
  if (error) return <div className="flex h-screen items-center justify-center bg-background text-foreground p-4 text-center">{error}</div>;
  if (!data) return null;

  return (
    <div className="relative h-screen w-full bg-background">
      <Head>
        <title>Sattilik Taxi — Сапарды бақылау</title>
      </Head>

      {/* Info Panel */}
      <div className="absolute top-4 left-4 right-4 z-[1000] bg-card/95 backdrop-blur-md border border-border p-4 rounded-2xl text-card-foreground shadow-xl">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-bold text-foreground">Сапарды бақылау</h1>
            <p className="text-sm opacity-80">Жүргізуші: {data.driver.first_name} {data.driver.last_name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-60">Бағыт</p>
            <p className="text-xs font-medium truncate w-32">{data.order.dropoff_address}</p>
          </div>
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={[data.location?.lat || 43.2, data.location?.lng || 76.8]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {data.location && (
          <Marker position={[data.location.lat, data.location.lng]} />
        )}
      </MapContainer>
    </div>
  );
}
