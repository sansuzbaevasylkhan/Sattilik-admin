import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Жүргізушінің GPS орнын driver_locations кестесіне жібереді.
 * `active` true болғанда ғана іске қосылады (мысалы, белсенді сапар кезінде).
 */
export function useLocationBroadcast(phone: string | null, active: boolean) {
  const subRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!active || !phone) {
      subRef.current?.remove();
      subRef.current = null;
      return;
    }

    let cancelled = false;

    const start = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      subRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 20 },
        (pos) => {
          fetch(`${SUPABASE_URL}/rest/v1/driver_locations?on_conflict=phone`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              Prefer: 'resolution=merge-duplicates',
            },
            body: JSON.stringify({
              phone,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              updated_at: new Date().toISOString(),
            }),
          }).catch(() => {});
        },
      );
    };

    start();

    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
    };
  }, [phone, active]);
}
