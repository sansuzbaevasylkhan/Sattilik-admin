import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface LocationUpdate {
  lng: number;
  lat: number;
  bearing?: number;
  updated_at: string;
}

/**
 * Жолаушы жағында: жүргізушінің орналасқан жерін Supabase Realtime арқылы
 * нақты уақытта бақылайды.
 */
export function useDriverLocation(driverPhone: string | null) {
  const [location, setLocation] = useState<LocationUpdate | null>(null);

  useEffect(() => {
    if (!driverPhone) {
      const clear = setTimeout(() => setLocation(null), 0);
      return () => clearTimeout(clear);
    }

    // 1. Алдымен соңғы белгілі орнын алу (Initial state)
    const fetchInitialLocation = async () => {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('lat, lng, updated_at')
        .eq('phone', driverPhone)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        setLocation(null);
        return;
      }
      if (Date.now() - new Date(data.updated_at).getTime() > 120_000) {
        setLocation(null);
        return;
      }
      setLocation({
        lng: data.lng,
        lat: data.lat,
        updated_at: data.updated_at,
      });
    };

    void fetchInitialLocation();
    const refreshInterval = setInterval(() => void fetchInitialLocation(), 5000);

    // 2. Realtime жазылу (Realtime subscription)
    const channel = supabase
      .channel(`driver_location_${driverPhone}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_locations',
          filter: `phone=eq.${driverPhone}`,
        },
        (payload) => {
          const newData = payload.new as LocationUpdate;
          setLocation({
            lng: newData.lng,
            lat: newData.lat,
            bearing: newData.bearing,
            updated_at: newData.updated_at,
          });
        }
      )
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, [driverPhone]);

  return location;
}
