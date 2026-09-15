import { useEffect } from 'react';

declare global {
  // eslint-disable-next-line no-var
  var frameworkReady: (() => void) | undefined;
}

export function useFrameworkReady() {
  useEffect(() => {
    // Web-те ғана жұмыс істейтін хук; Expo Go-да no-op
    if (typeof globalThis !== 'undefined' && (globalThis as any).frameworkReady) {
      (globalThis as any).frameworkReady();
    }
  }, []);
}
