import { MAPTILER_API_KEY } from '@/lib/maptiler';

/**
 * Координатты мекенжайға айналдырады (reverse geocoding).
 * Ешнәрсе табылмаса — координаттың өзін жолға айналдырып қайтарады
 * (карта мекенжай жоқ дегендіктен бос қалмайды).
 */
export async function reverseGeocode(lng: number, lat: number): Promise<string> {
  const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  if (!MAPTILER_API_KEY) return fallback;

  try {
    const res = await fetch(
      `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_API_KEY}&language=kk&limit=1`,
    );
    if (!res.ok) return fallback;

    const data = await res.json();
    const placeName = data?.features?.[0]?.place_name;
    return typeof placeName === 'string' && placeName.trim() ? placeName : fallback;
  } catch {
    return fallback;
  }
}
