export type MapPickField = 'pickup' | 'dropoff';

export interface MapPickResult {
  field: MapPickField;
  address: string;
  lng: number;
  lat: number;
}

let lastResult: MapPickResult | null = null;
const listeners: Array<(result: MapPickResult) => void> = [];

export function publishMapPick(result: MapPickResult) {
  lastResult = result;
  listeners.forEach((fn) => fn(result));
}

export function subscribeMapPick(fn: (result: MapPickResult) => void): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

export function consumeLastMapPick(): MapPickResult | null {
  const result = lastResult;
  lastResult = null;
  return result;
}
