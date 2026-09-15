const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

export interface RouteResult {
  coordinates: [number, number][]; // [lng, lat][]
  distanceKm: number;
  durationMin: number;
  isFallback: boolean;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Хаверсин формуласы бойынша қашықтық (км). */
function haversineKm(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function fallbackRoute(lng1: number, lat1: number, lng2: number, lat2: number): RouteResult {
  const distanceKm = haversineKm(lng1, lat1, lng2, lat2);
  // Қала ішінде орташа жылдамдық ~30 км/сағ деп есептейміз.
  const durationMin = (distanceKm / 30) * 60;
  return {
    coordinates: [
      [lng1, lat1],
      [lng2, lat2],
    ],
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMin: Math.round(durationMin),
    isFallback: true,
  };
}

/**
 * Нақты жол бойынша маршрут (OSRM). Сервер жауап бермесе —
 * тікелей сызық + хаверсин қашықтығына оралады, апп маршрутсыз қалмайды.
 */
export async function getRoute(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
): Promise<RouteResult> {
  try {
    const res = await fetch(
      `${OSRM_URL}/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`,
    );
    if (!res.ok) return fallbackRoute(lng1, lat1, lng2, lat2);

    const data = await res.json();
    const route = data?.routes?.[0];
    const coords = route?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length === 0) {
      return fallbackRoute(lng1, lat1, lng2, lat2);
    }

    return {
      coordinates: coords as [number, number][],
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMin: Math.round(route.duration / 60),
      isFallback: false,
    };
  } catch {
    return fallbackRoute(lng1, lat1, lng2, lat2);
  }
}
