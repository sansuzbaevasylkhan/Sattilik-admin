import { useEffect, useState } from 'react';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Жолаушы жағында: жүргізушінің соңғы белгілі орнын 4 секунд сайын сұрап тұрады.
 */
export function useDriverLocation(driverPhone: string | null) {
  const [location, setLocation] = useState<{ lng: number; lat: number } | null>(null);

  useEffect(() => {
    if (!driverPhone) {
      setLocation(null);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/driver_locations?phone=eq.${encodeURIComponent(driverPhone)}&select=lat,lng&limit=1`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          },
        );
        if (!res.ok) return;
        const rows = await res.json();
        const row = rows?.[0];
        if (row && !cancelled) {
          setLocation({ lng: row.lng, lat: row.lat });
        }
      } catch {
        // жол ойнатылмайды, келесі поллда қайта көреміз
      }
    };

    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [driverPhone]);

  return location;
}
