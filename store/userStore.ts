import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserState {
  firstName: string;
  lastName: string;
  phone: string;
  role: 'passenger' | 'driver' | null;
  driverId: string | null;
}

const STORAGE_KEY = 'askdrv_user_session';

const state: UserState = {
  firstName: '',
  lastName: '',
  phone: '',
  role: null,
  driverId: null,
};

const listeners: Array<() => void> = [];

let hydrated = false;
let hydratePromise: Promise<void> | null = null;

/**
 * Қосымша ашылғанда сақталған сессияны AsyncStorage-тан оқиды.
 * app/index.tsx осыны күтіп барып қайда бағыттау керегін шешеді
 * (тіркелген болса — тікелей order/driver-order, болмаса — onboarding).
 */
export function hydrateUser(): Promise<void> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<UserState>;
        Object.assign(state, saved);
      }
    } catch {
      // сақталған сессия оқылмаса — таза күймен жалғастырамыз
    } finally {
      hydrated = true;
      listeners.forEach((fn) => fn());
    }
  })();
  return hydratePromise;
}

export function isHydrated(): boolean {
  return hydrated;
}

export function setUser(data: Partial<UserState>) {
  Object.assign(state, data);
  listeners.forEach((fn) => fn());
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
}

export function getUser(): UserState {
  return { ...state };
}

export function subscribeUser(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

/** Шығу (logout): сақталған сессияны толығымен өшіреді. */
export function clearUser() {
  Object.assign(state, {
    firstName: '',
    lastName: '',
    phone: '',
    role: null,
    driverId: null,
  });
  listeners.forEach((fn) => fn());
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}
