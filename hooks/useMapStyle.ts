import { useCallback, useState } from 'react';
import { MAP_STYLES, MapStyleId } from '@/lib/maptiler';

const ORDER: MapStyleId[] = ['hybrid', 'streets', 'satellite'];

export function useMapStyle() {
  const [index, setIndex] = useState(0);
  const styleId = ORDER[index];

  const cycle = useCallback(() => {
    setIndex((prev) => (prev + 1) % ORDER.length);
  }, []);

  return {
    styleId,
    styleUrl: MAP_STYLES[styleId],
    cycle,
  };
}
