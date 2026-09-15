const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_API_KEY ?? '';

export type MapStyleId = 'streets' | 'satellite' | 'hybrid';

export const MAP_STYLES: Record<MapStyleId, string> = {
  streets: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
  satellite: `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`,
  hybrid: `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`,
};

export const MAPTILER_API_KEY = MAPTILER_KEY;

// Координата тәртібі: [longitude, latitude] (Google Maps-тың кері реті!)
export const QAZALY_CENTER: [number, number] = [62.1006, 45.7664]; // Қазалы, Қызылорда облысы
export const QAZALY_DEFAULT_ZOOM = 14;

// Қазақстан шекарасы (карта осы аймақпен шектеледі)
export const KAZAKHSTAN_BOUNDS: [[number, number], [number, number]] = [
  [46.5, 40.5], // SW [lng, lat]
  [87.5, 55.5], // NE [lng, lat]
];
