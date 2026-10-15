import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

export default function TrackTrip({ params }: { params: { token: string } }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-trip-status?token=${params.token}`);
        if (!res.ok) throw new Error('Сілтеме жарамсыз немесе мерзімі өткен');
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [params.token]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-white">Жүктелуде...</div>;
  if (error) return <div className="flex h-screen items-center justify-center bg-black text-white p-4 text-center">{error}</div>;
  if (!data) return null;

  return (
    <div className="relative h-screen w-full bg-black">
      <Head>
        <title>Sattilik Taxi — Сапарды бақылау</title>
      </Head>

      {/* Info Panel */}
      <div className="absolute top-4 left-4 right-4 z-[1000] bg-black/80 backdrop-blur-md border border-yellow-500/30 p-4 rounded-2xl text-white shadow-xl">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-bold text-yellow-500">Сапарды бақылау</h1>
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
