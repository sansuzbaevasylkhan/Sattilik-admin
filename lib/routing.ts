/**
 * Нақты жол бойынша маршрут: OSRM (ашық, кілтсіз) арқылы геометрия,
 * бұрылыс қадамдары, қашықтық және уақыт. Жауап болмаса — тікелей сызық.
 *
 * Өндірісте өз OSRM/маршрут серверін EXPO_PUBLIC_ROUTING_API_URL арқылы
 * көрсетуге болады (мыс. https://router.example.kz/route/v1/driving).
 */
const OSRM_URL =
  process.env.EXPO_PUBLIC_ROUTING_API_URL ?? 'https://router.project-osrm.org/route/v1/driving';
const REQUEST_TIMEOUT_MS = 8000;

export type RouteProvider = 'osrm' | 'fallback';

export interface RouteStep {
  /** OSRM: depart, turn, continue, merge, fork, roundabout, arrive, ... */
  type: string;
  /** left, right, straight, slight left, sharp right, uturn, ... */
  modifier: string;
  street: string;
  distanceM: number;
  durationS: number;
  location: [number, number] | null;
}

export interface RouteResult {
  /** [lng, lat][] — нақты жол геометриясы. */
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
  steps: RouteStep[];
  isFallback: boolean;
  provider: RouteProvider;
}

export interface RouteProgress {
  /** Маршрут бойымен жүрілген қашықтық (0..1). */
  ratio: number;
  remainingM: number;
  remainingKm: number;
  remainingMin: number;
  /** Келесі бұрылысқа дейінгі қашықтық (м). */
  distanceToNextStepM: number;
  nextStep: RouteStep | null;
  /** Маршрут сызығынан ауытқу (м) — қайта есептеу шешімі үшін. */
  distanceToRouteM: number;
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
    durationMin: Math.max(1, Math.round(durationMin)),
    steps: [
      {
        type: 'depart',
        modifier: '',
        street: '',
        distanceM: Math.round(distanceKm * 1000),
        durationS: Math.round(durationMin * 60),
        location: [lng1, lat1],
      },
      {
        type: 'arrive',
        modifier: '',
        street: '',
        distanceM: 0,
        durationS: 0,
        location: [lng2, lat2],
      },
    ],
    isFallback: true,
    provider: 'fallback',
  };
}

async function fetchJson(url: string): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface OsrmStep {
  maneuver?: { type?: string; modifier?: string; location?: [number, number] };
  name?: string;
  distance?: number;
  duration?: number;
}

function parseOsrmSteps(route: any): RouteStep[] {
  const legs: any[] = Array.isArray(route?.legs) ? route.legs : [];
  const raw: OsrmStep[] = legs.flatMap((leg) => (Array.isArray(leg?.steps) ? leg.steps : []));
  return raw.map((step) => ({
    type: step.maneuver?.type ?? 'turn',
    modifier: step.maneuver?.modifier ?? '',
    street: typeof step.name === 'string' ? step.name : '',
    distanceM: typeof step.distance === 'number' ? step.distance : 0,
    durationS: typeof step.duration === 'number' ? step.duration : 0,
    location: step.maneuver?.location ?? null,
  }));
}

/**
 * Екі нүкте арасындағы нақты жол маршруты (көшелер бойымен).
 * Сервер жауап бермесе — тікелей сызық + хаверсин қашықтығына оралады,
 * апп маршрутсыз қалмайды.
 */
export async function getRoute(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
): Promise<RouteResult> {
  const url =
    `${OSRM_URL}/${lng1},${lat1};${lng2},${lat2}` +
    '?overview=full&geometries=geojson&steps=true&alternatives=false';

  const data = await fetchJson(url);
  const route = data?.routes?.[0];
  const coords = route?.geometry?.coordinates;

  if (!Array.isArray(coords) || coords.length < 2) {
    return fallbackRoute(lng1, lat1, lng2, lat2);
  }

  return {
    coordinates: coords as [number, number][],
    distanceKm: Math.round((route.distance / 1000) * 10) / 10,
    durationMin: Math.max(1, Math.round(route.duration / 60)),
    steps: parseOsrmSteps(route),
    isFallback: false,
    provider: 'osrm',
  };
}

interface SegmentLength {
  meters: number;
  /** Сегмент басының маршрут бойымен жинақталған қашықтығы. */
  startM: number;
}

function measureSegments(coordinates: [number, number][]): { segments: SegmentLength[]; totalM: number } {
  const segments: SegmentLength[] = [];
  let total = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lng1, lat1] = coordinates[i];
    const [lng2, lat2] = coordinates[i + 1];
    const meters = haversineKm(lng1, lat1, lng2, lat2) * 1000;
    segments.push({ meters, startM: total });
    total += meters;
  }
  return { segments, totalM: total };
}

/** Нүктенің кесіндіге проекциясының параметрі (0..1) және ауытқуы (м). */
function projectOnSegment(
  lng: number,
  lat: number,
  a: [number, number],
  b: [number, number],
): { t: number; offsetM: number } {
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(toRad(lat));
  const ax = (a[0] - lng) * mPerDegLng;
  const ay = (a[1] - lat) * mPerDegLat;
  const bx = (b[0] - lng) * mPerDegLng;
  const by = (b[1] - lat) * mPerDegLat;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq)) : 0;
  const px = ax + dx * t;
  const py = ay + dy * t;
  return { t, offsetM: Math.hypot(px, py) };
}

/**
 * Ағымдағы GPS орны бойынша маршруттың қалған бөлігін, келесі бұрылысты,
 * қалған қашықтық/уақытты және маршруттан ауытқуды есептейді.
 */
export function getRouteProgress(route: RouteResult, lng: number, lat: number): RouteProgress {
  const coords = route.coordinates;
  if (coords.length < 2) {
    return {
      ratio: 0,
      remainingM: 0,
      remainingKm: 0,
      remainingMin: 0,
      distanceToNextStepM: 0,
      nextStep: null,
      distanceToRouteM: 0,
    };
  }

  const { segments, totalM } = measureSegments(coords);

  let bestIndex = 0;
  let bestT = 0;
  let bestOffset = Number.POSITIVE_INFINITY;
  for (let i = 0; i < segments.length; i++) {
    const { t, offsetM } = projectOnSegment(lng, lat, coords[i], coords[i + 1]);
    if (offsetM < bestOffset) {
      bestOffset = offsetM;
      bestIndex = i;
      bestT = t;
    }
  }

  const traveledM = Math.min(totalM, segments[bestIndex].startM + segments[bestIndex].meters * bestT);
  const remainingM = Math.max(0, totalM - traveledM);
  const remainingMin = totalM > 0 ? (route.durationMin * remainingM) / totalM : 0;

  // Әр қадамның маршрут бойындағы басталу нүктесін жинақтаймыз.
  const stepTotalM = route.steps.reduce((sum, step) => sum + Math.max(0, step.distanceM), 0);
  const scale = stepTotalM > 0 ? totalM / stepTotalM : 0;
  let stepCursorM = 0;
  let nextStep: RouteStep | null = null;
  let distanceToNextStepM = remainingM;

  for (const step of route.steps) {
    if (step.type === 'depart') {
      stepCursorM += Math.max(0, step.distanceM) * scale;
      continue;
    }
    const startM = stepCursorM;
    if (startM >= traveledM - 5) {
      nextStep = step;
      distanceToNextStepM = Math.max(0, startM - traveledM);
      break;
    }
    stepCursorM += Math.max(0, step.distanceM) * scale;
  }

  return {
    ratio: totalM > 0 ? Math.min(1, traveledM / totalM) : 0,
    remainingM,
    remainingKm: Math.round((remainingM / 1000) * 10) / 10,
    remainingMin: Math.max(0, Math.round(remainingMin)),
    distanceToNextStepM,
    nextStep,
    distanceToRouteM: bestOffset,
  };
}
