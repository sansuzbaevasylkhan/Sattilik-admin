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
      setLocation(null);
      return;
    }

    // 1. Алдымен соңғы белгілі орнын алу (Initial state)
    const fetchInitialLocation = async () => {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('lat, lng, bearing, updated_at')
        .eq('phone', driverPhone)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setLocation({
          lng: data.lng,
          lat: data.lat,
          bearing: data.bearing,
          updated_at: data.updated_at,
        });
      }
    };

    fetchInitialLocation();

    // 2. Realtime жазылу (Realtime subscription)
    const channel = supabase
      .channel(`driver_location_${driverPhone}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
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
      supabase.removeChannel(channel);
    };
  }, [driverPhone]);

  return location;
}
