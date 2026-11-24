/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutated inside gesture worklets. */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Linking,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { createClient } from '@supabase/supabase-js';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Navigation,
  User,
  Phone,
  Clock,
  Route,
  Wallet,
  Play,
  CheckCircle,
  Menu,
  RefreshCw,
  Inbox,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  RotateCcw,
  Flag,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react-native';
import MenuDrawer from '@/components/MenuDrawer';
import { getUser } from '@/store/userStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocationBroadcast } from '@/hooks/useLocationBroadcast';
import RouteMapPreview from '@/components/RouteMapPreview';
import { getRoute, getRouteProgress, RouteResult, RouteStep } from '@/lib/routing';
import { invokePushEvent } from '@/lib/notifications';
import { GOLD_GRADIENT } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwipeToAccept } from '@/components/SwipeToAccept';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const abbrev = (firstName: string, lastName: string) => {
  const first = firstName?.trim().split(/\s+/)[0] || '';
  const lastInitial = Array.from(lastName?.trim() || '')[0];
  return `${first}${lastInitial ? ` ${lastInitial.toLocaleUpperCase()}.` : ''}`;
};

type ScreenMode = 'list' | 'active';

interface Order {
  id: string;
  passenger_phone: string;
  passenger_first_name: string;
  passenger_last_name: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  distance: string;
  estimated_time: string;
  price: number;
  status: string;
  driver_phone?: string;
  driver_first_name?: string;
  driver_last_name?: string;
  passenger_reviewed?: boolean;
  expires_at?: string;
  created_at?: string;
}



export default function DriverOrderScreen() {
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ScreenMode>('list');
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersLoadError, setOrdersLoadError] = useState(false);
  const ordersLoadedRef = useRef(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [activeOrderStatus, setActiveOrderStatus] = useState<'accepted' | 'in_progress' | 'completed'>('accepted');

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeRouteState, setActiveRouteState] = useState<{ orderId: string; route: RouteResult } | null>(null);
  const [previewRouteState, setPreviewRouteState] = useState<{ orderId: string; route: RouteResult } | null>(null);
  const [driverPos, setDriverPos] = useState<{ lng: number; lat: number; bearing: number } | null>(null);
  const route = activeOrderStatus !== 'completed' && activeRouteState && activeRouteState.orderId === activeOrder?.id
    ? activeRouteState.route
    : null;
  const routeProgress = useMemo(
    () => route && driverPos ? getRouteProgress(route, driverPos.lng, driverPos.lat) : null,
    [driverPos, route],
  );
  const [locationError, setLocationError] = useState(false);
  const [passengerAvatars, setPassengerAvatars] = useState<Record<string, string>>({});
  const [dismissedOrderIds, setDismissedOrderIds] = useState<string[]>([]);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const sheetY = useSharedValue(Math.max(120, windowHeight - 380));
  const sheetStartY = useSharedValue(Math.max(120, windowHeight - 380));
  const sheetExpandedY = 92;
  const sheetCollapsedY = Math.max(120, windowHeight - 380);
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  useEffect(() => {
    sheetY.value = withSpring(sheetExpanded ? sheetExpandedY : sheetCollapsedY, {
      damping: 26,
      stiffness: 220,
    });
  }, [sheetCollapsedY, sheetExpanded, sheetY]);

  const sheetPan = React.useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          sheetStartY.value = sheetY.value;
        })
        .onUpdate((event) => {
          sheetY.value = Math.min(
            sheetCollapsedY,
            Math.max(sheetExpandedY, sheetStartY.value + event.translationY),
          );
        })
        .onEnd((event) => {
          const midpoint = (sheetExpandedY + sheetCollapsedY) / 2;
          const expand = event.velocityY < -500 || (event.velocityY < 500 && sheetY.value < midpoint);
          sheetY.value = withSpring(expand ? sheetExpandedY : sheetCollapsedY, {
            damping: 26,
            stiffness: 220,
          });
          runOnJS(setSheetExpanded)(expand);
        }),
    [sheetCollapsedY, sheetExpandedY, sheetStartY, sheetY],
  );

  const lastRerouteRef = useRef(0);
  const lastPreviewRouteRef = useRef({ orderId: '', timestamp: 0 });
  const lastDriverPositionRef = useRef<{ lng: number; lat: number; bearing: number } | null>(null);
  const arrivedNotifiedRef = useRef<string | null>(null);

  useLocationBroadcast(
    getUser().phone || null,
    true,
  );

  const acceptButtonScale = useMemo(() => new Animated.Value(1), []);
  const completeButtonScale = useMemo(() => new Animated.Value(1), []);
  const callButtonScale = useMemo(() => new Animated.Value(1), []);
  const navButtonScale = useMemo(() => new Animated.Value(1), []);

  const fetchPendingOrders = useCallback(async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?status=eq.pending&order=created_at.desc&select=*`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (!res.ok) throw new Error(`Orders fetch failed (${res.status})`);
      const orders: Order[] = await res.json();
      ordersLoadedRef.current = true;
      setOrdersLoading(false);
      setOrdersLoadError(false);
      const visibleOrders = (orders || []).filter((order) => !dismissedOrderIds.includes(order.id));
      setPendingOrders(visibleOrders);

      const phones = [...new Set(visibleOrders.map((order) => order.passenger_phone).filter(Boolean))];
      if (phones.length) {
        const query = new URLSearchParams({
          select: 'phone,avatar_url',
          phone: `in.(${phones.map((phone) => `"${phone.replaceAll('"', '\\"')}"`).join(',')})`,
        });
        const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/users?${query}`, {
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        });
        if (profileRes.ok) {
          const profiles: { phone: string; avatar_url: string | null }[] = await profileRes.json();
          setPassengerAvatars((current) => ({
            ...current,
            ...Object.fromEntries(profiles.filter((p) => p.avatar_url).map((p) => [p.phone, p.avatar_url!])),
          }));
        }
      }
    } catch (e) {
      console.error('Fetch error:', e);
      if (!ordersLoadedRef.current) setOrdersLoading(false);
      setOrdersLoadError(true);
    }
  }, [dismissedOrderIds]);

  const fetchActiveOrder = useCallback(async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?status=in.(accepted,in_progress)&driver_phone=eq.${encodeURIComponent(getUser().phone)}&order=created_at.desc&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      const orders: Order[] = await res.json();
        if (orders && orders.length > 0) {
          setActiveOrder(orders[0]);
          setActiveOrderStatus(orders[0].status as 'accepted' | 'in_progress');
          setMode('active');
        }
    } catch (e) {
      console.error('Fetch active error:', e);
    }
  }, []);

  // Fetch persisted requests after the first paint, then use the timer as the
  // fallback when Realtime is temporarily disconnected.
  useEffect(() => {
    const initialFetch = setTimeout(() => {
      void fetchActiveOrder();
      void fetchPendingOrders();
    }, 0);
    const interval = setInterval(fetchPendingOrders, 5000);
    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, [fetchActiveOrder, fetchPendingOrders]);

  useEffect(() => {
    const channel = supabase
      .channel('driver-orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchPendingOrders();
        fetchActiveOrder();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [fetchActiveOrder, fetchPendingOrders]);

  useEffect(() => {
    const phone = activeOrder?.passenger_phone;
    if (!phone || passengerAvatars[phone]) return;
    const query = new URLSearchParams({
      select: 'phone,avatar_url',
      phone: `eq.${phone}`,
    });
    fetch(`${SUPABASE_URL}/rest/v1/users?${query}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    })
      .then(async (response) => response.ok ? response.json() : [])
      .then((profiles: { phone: string; avatar_url: string | null }[]) => {
        const avatar = profiles[0]?.avatar_url;
        if (avatar) setPassengerAvatars((current) => ({ ...current, [phone]: avatar }));
      })
      .catch((error) => console.warn('Passenger avatar lookup failed:', error));
  }, [activeOrder?.passenger_phone, passengerAvatars]);

  const pickupPoint =
    activeOrder && activeOrder.pickup_lat != null && activeOrder.pickup_lng != null
      ? { lat: activeOrder.pickup_lat, lng: activeOrder.pickup_lng }
      : null;
  const dropoffPoint =
    activeOrder && activeOrder.dropoff_lat != null && activeOrder.dropoff_lng != null
      ? { lat: activeOrder.dropoff_lat, lng: activeOrder.dropoff_lng }
      : null;
  const activeOrderId = activeOrder?.id ?? null;
  const pickupLat = pickupPoint?.lat ?? null;
  const pickupLng = pickupPoint?.lng ?? null;
  const dropoffLat = dropoffPoint?.lat ?? null;
  const dropoffLng = dropoffPoint?.lng ?? null;
  const hasDriverPosition = driverPos !== null;

  const mapOrder = activeOrder ?? pendingOrders[0] ?? null;
  const mapPickup = mapOrder?.pickup_lat != null && mapOrder.pickup_lng != null
    ? { lat: mapOrder.pickup_lat, lng: mapOrder.pickup_lng }
    : pickupPoint;
  const mapDropoff = mapOrder?.dropoff_lat != null && mapOrder.dropoff_lng != null
    ? { lat: mapOrder.dropoff_lat, lng: mapOrder.dropoff_lng }
    : dropoffPoint;
  const previewDriverLat = driverPos?.lat ?? null;
  const previewDriverLng = driverPos?.lng ?? null;
  const previewPickupLat = mapPickup?.lat ?? null;
  const previewPickupLng = mapPickup?.lng ?? null;
  const previewRoute = mode === 'list' && previewRouteState?.orderId === mapOrder?.id
    ? previewRouteState.route
    : null;

  useEffect(() => {
    if (mode !== 'list' || previewDriverLat === null || previewDriverLng === null || previewPickupLat === null || previewPickupLng === null) return;
    const orderId = mapOrder?.id;
    if (!orderId) return;
    if (lastPreviewRouteRef.current.orderId === orderId && Date.now() - lastPreviewRouteRef.current.timestamp < 12000) return;
    lastPreviewRouteRef.current = { orderId, timestamp: Date.now() };
    let cancelled = false;
    getRoute(previewDriverLng, previewDriverLat, previewPickupLng, previewPickupLat).then((nextRoute) => {
      if (!cancelled) setPreviewRouteState({ orderId, route: nextRoute });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [mapOrder?.id, mode, previewDriverLat, previewDriverLng, previewPickupLat, previewPickupLng]);

  // Нақты GPS: орналасу мен қозғалыс бағыты үнемі жаңарып отырады.
  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    const start = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError(true);
          return;
        }
        if (cancelled) return;
        setLocationError(false);
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 10 },
          (pos) => {
            const previous = lastDriverPositionRef.current;
            const heading = pos.coords.heading;
            let bearing = previous?.bearing ?? 0;
            if (typeof heading === 'number' && heading >= 0) {
              bearing = heading;
            } else if (previous && (previous.lng !== pos.coords.longitude || previous.lat !== pos.coords.latitude)) {
              const toRad = (degrees: number) => degrees * Math.PI / 180;
              const lat1 = toRad(previous.lat);
              const lat2 = toRad(pos.coords.latitude);
              const deltaLng = toRad(pos.coords.longitude - previous.lng);
              const y = Math.sin(deltaLng) * Math.cos(lat2);
              const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
              bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
            }
            const nextPosition = {
              lng: pos.coords.longitude,
              lat: pos.coords.latitude,
              bearing,
            };
            lastDriverPositionRef.current = nextPosition;
            setDriverPos(nextPosition);
          },
        );
      } catch (error) {
        console.warn('Driver GPS could not start:', error);
        setLocationError(true);
      }
    };

    start();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  // Қабылданғанда — жолаушыға дейін, жолда — межелі орынға дейін нақты маршрут.
  useEffect(() => {
    if (!activeOrderId) return;

    const pickup = pickupLat !== null && pickupLng !== null ? { lat: pickupLat, lng: pickupLng } : null;
    const dropoff = dropoffLat !== null && dropoffLng !== null ? { lat: dropoffLat, lng: dropoffLng } : null;
    const currentDriver = lastDriverPositionRef.current;

    let from: { lat: number; lng: number } | null = null;
    let to: { lat: number; lng: number } | null = null;

    if (activeOrderStatus === 'accepted') {
      from = currentDriver ? { lat: currentDriver.lat, lng: currentDriver.lng } : pickup;
      if (currentDriver) {
        to = pickup;
      } else if (pickup && dropoff) {
        // GPS әлі келмесе — алдын ала толық маршрутты көрсетеміз.
        to = dropoff;
      }
    } else if (activeOrderStatus === 'in_progress') {
      from = currentDriver ? { lat: currentDriver.lat, lng: currentDriver.lng } : pickup;
      to = dropoff;
    }

    if (!from || !to) {
      return;
    }

    let cancelled = false;
    lastRerouteRef.current = Date.now();
    getRoute(from.lng, from.lat, to.lng, to.lat).then((result) => {
      if (!cancelled) setActiveRouteState({ orderId: activeOrderId, route: result });
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeOrderId,
    activeOrderStatus,
    hasDriverPosition,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
  ]);

  // Маршруттан 60 м-ден көп ауытқыса — 15 секундтан кейін қайта есептеу.
  useEffect(() => {
    if (!driverPos || !activeOrderId || !routeProgress) return;
    if (activeOrderStatus !== 'accepted' && activeOrderStatus !== 'in_progress') return;
    if (routeProgress.distanceToRouteM < 60) return;

    const destination = activeOrderStatus === 'accepted'
      ? (pickupLat !== null && pickupLng !== null ? { lat: pickupLat, lng: pickupLng } : null)
      : (dropoffLat !== null && dropoffLng !== null ? { lat: dropoffLat, lng: dropoffLng } : null);
    if (!destination) return;

    const now = Date.now();
    if (now - lastRerouteRef.current < 15000) return;
    lastRerouteRef.current = now;

    let cancelled = false;
    getRoute(driverPos.lng, driverPos.lat, destination.lng, destination.lat).then((result) => {
      if (!cancelled) setActiveRouteState({ orderId: activeOrderId, route: result });
    });

    return () => {
      cancelled = true;
    };
  }, [
    driverPos,
    routeProgress,
    activeOrderId,
    activeOrderStatus,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
  ]);

  // Жолаушыға «жүргізуші келді» push хабарын бір рет жіберу.
  useEffect(() => {
    if (!activeOrderId || activeOrderStatus !== 'accepted' || !routeProgress) return;
    if (arrivedNotifiedRef.current === activeOrderId) return;
    if (routeProgress.remainingM > 150) return;

    arrivedNotifiedRef.current = activeOrderId;
    invokePushEvent('driver_arrived', { orderId: activeOrderId });
  }, [activeOrderId, activeOrderStatus, routeProgress]);

  useEffect(() => {
    if (mode === 'active' && activeOrder) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(
            `${SUPABASE_URL}/rest/v1/orders?id=eq.${activeOrder.id}&select=*`,
            {
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              },
            }
          );
          const orders: Order[] = await res.json();
          if (orders && orders.length > 0) {
            const order = orders[0];
          setActiveOrder(order);
            // status may be completed as well
            setActiveOrderStatus((order.status as any) || 'accepted');

            if (order.status === 'completed' || order.status === 'cancelled') {
              const reviewed = !!order.passenger_reviewed;
              if (reviewed) {
                setMode('list');
                setActiveOrder(null);
                fetchPendingOrders();
              } else {
                // keep showing trip UI until passenger reviews
                setActiveOrder(order);
                setActiveOrderStatus('completed');
              }
            }

          }
        } catch (e) {
          console.error('Poll error:', e);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [mode, activeOrder, fetchPendingOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchPendingOrders(), fetchActiveOrder()]);
    } finally {
      setRefreshing(false);
    }
  };

  const animatePress = (anim: Animated.Value, callback?: () => void) => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => callback?.());
  };

  const handleAcceptOrder = async (order: Order) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}&status=eq.pending`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            status: 'accepted',
            driver_phone: getUser().phone,
            driver_first_name: getUser().firstName,
            driver_last_name: getUser().lastName,
          }),
        }
      );
      if (!res.ok) throw new Error(`Order acceptance failed (${res.status})`);
      const acceptedOrders: Order[] = await res.json();
      const acceptedOrder = acceptedOrders[0];
      if (acceptedOrder) {
        setActiveOrder(acceptedOrder);
        setActiveOrderStatus('accepted');
        setMode('active');
        setPendingOrders(prev => prev.filter(o => o.id !== order.id));
        setSheetExpanded(false);
        invokePushEvent('order_accepted', { orderId: order.id });
      } else {
        setPendingOrders((current) => current.filter((item) => item.id !== order.id));
        Alert.alert(t('driverOrder.errorAcceptTitle'), t('driverOrder.orderAlreadyTaken'));
      }
    } catch {
      Alert.alert(t('driverOrder.errorAcceptTitle'), t('driverOrder.errorNetworkMessage'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineOrder = (order: Order) => {
    Alert.alert(
      t('driverOrder.declineTitle'),
      t('driverOrder.declineMessage'),
      [
        { text: t('driverOrder.noButton'), style: 'cancel' },
        {
          text: t('driverOrder.yesButton'),
          style: 'destructive',
          onPress: () => {
            // Declining an unassigned request hides it only for this driver;
            // its shared order status stays pending for other drivers.
            setDismissedOrderIds((current) => [...new Set([...current, order.id])]);
            setPendingOrders((current) => current.filter((item) => item.id !== order.id));
          },
        },
      ],
    );
  };

  const handleCancelAcceptedOrder = () => {
    if (!activeOrder) return;
    Alert.alert(
      t('driverOrder.cancelTitle'),
      t('driverOrder.cancelMessage'),
      [
        { text: t('driverOrder.noButton'), style: 'cancel' },
        {
          text: t('driverOrder.yesButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(activeOrder.id)}&driver_phone=eq.${encodeURIComponent(getUser().phone)}&status=eq.accepted`,
                {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                    Prefer: 'return=representation',
                  },
                  body: JSON.stringify({ status: 'cancelled' }),
                },
              );
              if (!response.ok || (await response.json()).length === 0) throw new Error('Order cancellation failed');
              setActiveOrder(null);
              setMode('list');
              setSheetExpanded(false);
              await fetchPendingOrders();
            } catch {
              Alert.alert(t('driverOrder.errorAcceptTitle'), t('driverOrder.errorCancelMessage'));
            }
          },
        },
      ],
    );
  };

  const handleStartTrip = () => {
    animatePress(acceptButtonScale, async () => {
      if (!activeOrder) return;
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(activeOrder.id)}&driver_phone=eq.${encodeURIComponent(getUser().phone)}&status=eq.accepted`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Prefer: 'return=representation',
            },
            body: JSON.stringify({ status: 'in_progress' }),
          }
        );
        if (!response.ok || (await response.json()).length === 0) throw new Error('Order status update failed');
        setActiveOrderStatus('in_progress');
        setActiveOrder(prev => prev ? { ...prev, status: 'in_progress' } : null);
        invokePushEvent('trip_started', { orderId: activeOrder.id });
      } catch {
        Alert.alert(t('driverOrder.errorAcceptTitle'), t('driverOrder.errorStatusChangeMessage'));
      }
    });
  };

  const handleCompleteOrder = () => {
    animatePress(completeButtonScale, async () => {
      if (!activeOrder) return;
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(activeOrder.id)}&driver_phone=eq.${encodeURIComponent(getUser().phone)}&status=eq.in_progress`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Prefer: 'return=representation',
            },
            body: JSON.stringify({ status: 'completed' }),
          }
        );
        if (!response.ok || (await response.json()).length === 0) throw new Error('Order completion failed');
        invokePushEvent('trip_completed', { orderId: activeOrder.id });
        Alert.alert(
          t('driverOrder.successTitle'),
          t('driverOrder.orderCompletedMessage'),
          [{ text: t('driverOrder.okButton'), onPress: () => {
            setMode('list');
            setActiveOrder(null);
            fetchPendingOrders();
          }}]
        );
      } catch {
        Alert.alert(t('driverOrder.errorAcceptTitle'), t('driverOrder.errorCompleteOrderMessage'));
      }
    });
  };

  const handleCallPassenger = (phone?: string) => {
    if (phone && phone !== 'guest') {
      animatePress(callButtonScale, () => {
        Linking.openURL(`tel:${phone}`);
      });
    } else {
      Alert.alert(t('driverOrder.infoTitle'), t('driverOrder.noPassengerPhoneMessage'));
    }
  };

  const handleOpenNavigation = (address: string) => {
    animatePress(navButtonScale, () => {
      const encodedAddress = encodeURIComponent(address);
      Linking.openURL(`https://maps.google.com/maps?q=${encodedAddress}`);
    });
  };

  const getStatusText = () => {
    if (activeOrderStatus === 'completed') return t('driverOrder.statusCompleted');
    if (activeOrderStatus === 'in_progress') return t('driverOrder.statusInProgress');
    return t('driverOrder.statusAccepted');
  };

  const formatMeters = (meters: number) =>
    meters >= 1000
      ? `${(meters / 1000).toFixed(1)} км`
      : `${Math.max(0, Math.round(meters / 10) * 10)} м`;

  const describeManeuver = (step: RouteStep) => {
    const street = step.street ? ` · ${step.street}` : '';
    if (step.type === 'arrive') return t('driverOrder.navArrive');
    if (step.type === 'roundabout' || step.type === 'rotary') {
      return `${t('driverOrder.navRoundabout')}${street}`;
    }
    if (step.modifier?.includes('uturn')) return `${t('driverOrder.navUTurn')}${street}`;
    if (step.modifier?.includes('left')) return `${t('driverOrder.navTurnLeft')}${street}`;
    if (step.modifier?.includes('right')) return `${t('driverOrder.navTurnRight')}${street}`;
    return `${t('driverOrder.navStraight')}${street}`;
  };

  const renderManeuverIcon = (step: RouteStep) => {
    if (step.type === 'arrive') return <Flag size={24} color="#FFD700" />;
    if (step.type === 'roundabout' || step.type === 'rotary') {
      return <RotateCcw size={24} color="#FFD700" />;
    }
    if (step.modifier?.includes('uturn')) return <RotateCcw size={24} color="#FFD700" />;
    if (step.modifier?.includes('left')) return <CornerUpLeft size={24} color="#FFD700" />;
    if (step.modifier?.includes('right')) return <CornerUpRight size={24} color="#FFD700" />;
    return <ArrowUp size={24} color="#FFD700" />;
  };

  const showNavigation = activeOrderStatus !== 'completed' && !!routeProgress?.nextStep;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <RouteMapPreview
        fill
        followDriver={false}
        fitRoute={false}
        pickup={mapPickup}
        dropoff={mapDropoff}
        driver={driverPos}
        routeCoordinates={mode === 'active' ? route?.coordinates ?? null : previewRoute?.coordinates ?? null}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.42)', 'transparent', 'transparent']}
        style={styles.mapScrim}
        pointerEvents="none"
      />

      <View style={[styles.header, { top: Math.max(48, insets.top + 8) }]}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} activeOpacity={0.7}>
          <Menu size={24} color="#FFD700" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {mode === 'active' ? t('driverOrder.headerTitleActive') : t('driverOrder.headerTitleList')}
          </Text>
          {mode === 'active' && (
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(0,0,0,0.78)' }]}>
              <View style={[styles.statusDot, { backgroundColor: '#FFD700' }]} />
              <Text style={[styles.statusText, { color: '#FFD700' }]}>
                {getStatusText()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{mode === 'active' ? '●' : pendingOrders.length}</Text>
        </View>
      </View>

      <Reanimated.View style={[styles.sheet, { height: windowHeight, paddingBottom: Math.max(20, insets.bottom + 16) }, sheetAnimatedStyle]}>
        <GestureDetector gesture={sheetPan}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={sheetExpanded ? t('driverOrder.collapseSheet') : t('driverOrder.expandSheet')}
            activeOpacity={0.9}
            onPress={() => setSheetExpanded((expanded) => !expanded)}
            style={styles.sheetHandleArea}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeadingRow}>
              <View>
                <Text style={styles.sheetTitle}>
                  {mode === 'active' ? t('driverOrder.headerTitleActive') : t('driverOrder.availableOrders')}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {mode === 'active' ? getStatusText() : `${pendingOrders.length} · ${t('driverOrder.headerTitleList')}`}
                </Text>
              </View>
              {sheetExpanded ? <ChevronDown size={22} color="#FFD700" /> : <ChevronUp size={22} color="#FFD700" />}
            </View>
          </TouchableOpacity>
        </GestureDetector>
      {locationError ? <Text style={styles.locationWarning}>{t('driverOrder.locationPermissionMessage')}</Text> : null}

      {mode === 'list' && (
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFD700"
            />
          }
        >
          {pendingOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              {ordersLoading ? <ActivityIndicator color="#FFD700" size="large" /> : <Inbox size={48} color="#FFD700" />}
              <Text style={styles.emptyTitle}>
                {ordersLoading ? t('driverOrder.loadingOrders') : ordersLoadError ? t('driverOrder.ordersLoadError') : t('driverOrder.emptyTitle')}
              </Text>
              <Text style={styles.emptySubtitle}>
                {locationError ? t('driverOrder.locationPermissionMessage') : ordersLoadError ? t('driverOrder.retryMessage') : t('driverOrder.emptySubtitle')}
              </Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={fetchPendingOrders}
                activeOpacity={0.7}
              >
                <RefreshCw size={20} color="#000000" />
                <Text style={styles.refreshButtonText}>{t('driverOrder.refreshButton')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            pendingOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.passengerInfo}>
                    <View style={styles.passengerAvatar}>
                      {passengerAvatars[order.passenger_phone] ? (
                        <Image source={{ uri: passengerAvatars[order.passenger_phone] }} style={styles.avatarImage} />
                      ) : <User size={18} color="#FFD700" />}
                    </View>
                    <View>
                      <Text style={styles.passengerName}>
                        {abbrev(order.passenger_first_name, order.passenger_last_name)}
                      </Text>
                      <Text style={styles.passengerLabel}>{t('driverOrder.passengerLabel')}</Text>
                      {order.created_at ? (
                        <Text style={styles.orderCreated}>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View style={styles.orderRoute}>
                  <View style={styles.routePoint}>
                    <View style={styles.routeDotGreen} />
                    <Text style={styles.routeAddress} numberOfLines={2}>
                      {order.pickup_address}
                    </Text>
                  </View>
                  <View style={styles.routeConnector} />
                  <View style={styles.routePoint}>
                    <View style={styles.routeDotRed} />
                    <Text style={styles.routeAddress} numberOfLines={2}>
                      {order.dropoff_address}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderMeta}>
                  <View style={styles.metaItem}>
                    <Route size={16} color="#A0A0A0" />
                    <Text style={styles.metaText}>{order.distance}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock size={16} color="#A0A0A0" />
                    <Text style={styles.metaText}>
                      {order.id === mapOrder?.id && previewRoute
                        ? `${previewRoute.durationMin} ${t('driverOrder.navMinutes')}`
                        : order.estimated_time}
                    </Text>
                  </View>
                  <View style={styles.metaPrice}>
                    <Text style={styles.metaPriceText}>{order.price} ₸</Text>
                  </View>
                </View>

                <SwipeToAccept
                  label={t('driverOrder.swipeToAccept')}
                  loading={loading}
                  disabled={loading}
                  onAccept={() => handleAcceptOrder(order)}
                />
                <TouchableOpacity style={styles.declineButton} onPress={() => handleDeclineOrder(order)}>
                  <X size={17} color="#B5B5B5" />
                  <Text style={styles.declineButtonText}>{t('driverOrder.declineButton')}</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {mode === 'active' && activeOrder && (
        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.activeScrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.passengerCard}>
            <View style={styles.passengerAvatarLarge}>
              {passengerAvatars[activeOrder.passenger_phone] ? (
                <Image source={{ uri: passengerAvatars[activeOrder.passenger_phone] }} style={styles.avatarImage} />
              ) : <User size={26} color="#FFD700" />}
            </View>
            <View style={styles.passengerCardInfo}>
              <Text style={styles.passengerCardName}>
                {abbrev(activeOrder.passenger_first_name, activeOrder.passenger_last_name)}
              </Text>
              <Text style={styles.passengerCardLabel}>{t('driverOrder.passengerLabel')}</Text>
            </View>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCallPassenger(activeOrder.passenger_phone)}
              activeOpacity={0.7}
            >
              <Animated.View style={[styles.callButtonInner, { transform: [{ scale: callButtonScale }] }]}>
                <Phone size={20} color="#000000" />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {showNavigation && routeProgress?.nextStep ? (
            <View style={styles.navCard}>
              <View style={styles.navTurnIcon}>{renderManeuverIcon(routeProgress.nextStep)}</View>
              <View style={styles.navTurnInfo}>
                <Text style={styles.navDistance}>{formatMeters(routeProgress.distanceToNextStepM)}</Text>
                <Text style={styles.navStreet} numberOfLines={1}>
                  {describeManeuver(routeProgress.nextStep)}
                </Text>
              </View>
              <View style={styles.navSummary}>
                <Text style={styles.navSummaryValue}>{routeProgress.remainingKm} км</Text>
                <Text style={styles.navSummaryLabel}>
                  {routeProgress.remainingMin} {t('driverOrder.navMinutes')}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.routeCard}>
            <View style={styles.routeLineContainer}>
              <View style={styles.routeDotPickup} />
              <View style={styles.routeLine}>
                <View style={styles.routeLineProgress} />
              </View>
              <View style={styles.routeDotDropoff} />
            </View>

            <View style={styles.routeDetails}>
              <View style={styles.routePointDetail}>
                <Text style={styles.routeLabel}>{t('driverOrder.pickupLabel')}</Text>
                <Text style={styles.routeAddressText}>{activeOrder.pickup_address}</Text>
              </View>

              <View style={styles.routeDistanceContainer}>
                <Route size={16} color="rgba(0, 0, 0, 0.55)" />
                <Text style={styles.routeDistanceText}>{activeOrder.distance}</Text>
              </View>

              <View style={styles.routePointDetail}>
                <Text style={styles.routeLabel}>{t('driverOrder.dropoffLabel')}</Text>
                <Text style={styles.routeAddressText}>{activeOrder.dropoff_address}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCards}>
            <View style={styles.infoCard}>
              <View style={[styles.infoIconCircle, { backgroundColor: '#292929' }]}>
                <Clock size={20} color="#FFD700" />
              </View>
              <Text style={styles.infoValue}>
                {routeProgress?.remainingMin ? `${routeProgress.remainingMin} ${t('driverOrder.navMinutes')}` : activeOrder.estimated_time}
              </Text>
              <Text style={styles.infoLabel}>{t('driverOrder.timeLabel')}</Text>
            </View>

            <View style={styles.infoCard}>
              <View style={[styles.infoIconCircle, { backgroundColor: '#292929' }]}>
                <Wallet size={20} color="#FFD700" />
              </View>
              <Text style={styles.infoValue}>{activeOrder.price} ₸</Text>
              <Text style={styles.infoLabel}>{t('driverOrder.paymentLabel')}</Text>
            </View>
          </View>

          <View style={styles.spacer} />

          <View style={styles.actionsContainer}>
            {activeOrderStatus === 'accepted' && (
              <Animated.View style={{ transform: [{ scale: acceptButtonScale }] }}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleStartTrip}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={GOLD_GRADIENT}
                    style={styles.primaryButtonGradient}
                  >
                    <Play size={22} color="#111111" fill="#111111" />
                    <Text style={styles.primaryButtonText}>{t('driverOrder.startTripButton')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            )}

            {activeOrderStatus === 'in_progress' && (
              <Animated.View style={{ transform: [{ scale: completeButtonScale }] }}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleCompleteOrder}
                  activeOpacity={0.8}
                  disabled={false}

                >
                  <LinearGradient
                    colors={GOLD_GRADIENT}
                    style={styles.primaryButtonGradient}
                  >
                    <CheckCircle size={22} color="#111111" />
                    <Text style={styles.primaryButtonText}>{t('driverOrder.completeOrderButton')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            )}

            {activeOrderStatus === 'accepted' && (
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelAcceptedOrder} activeOpacity={0.75}>
                <X size={18} color="#FFFFFF" />
                <Text style={styles.cancelButtonText}>{t('driverOrder.cancelTitle')}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.secondaryButtons}>
              <Animated.View style={[styles.secondaryButton, { transform: [{ scale: navButtonScale }] }]}>
                <TouchableOpacity
                  style={styles.secondaryButtonInner}
                  onPress={() => handleOpenNavigation(activeOrderStatus === 'in_progress' ? activeOrder.dropoff_address : activeOrder.pickup_address)}
                  activeOpacity={0.7}
                >
                  <Navigation size={20} color="#FFD700" />
                  <Text style={styles.secondaryButtonText}>{t('driverOrder.navigationButton')}</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={[styles.secondaryButton, { transform: [{ scale: callButtonScale }] }]}>
                <TouchableOpacity
                  style={styles.secondaryButtonInner}
                  onPress={() => handleCallPassenger(activeOrder.passenger_phone)}
                  activeOpacity={0.7}
                >
                  <Phone size={20} color="#FFD700" />
                  <Text style={styles.secondaryButtonText}>{t('driverOrder.callButton')}</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      )}
      </Reanimated.View>

      <MenuDrawer visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapScrim: {
    ...StyleSheet.absoluteFill,
  },
  background: {
    ...StyleSheet.absoluteFill,
  },
  header: {
    position: 'absolute',
    top: 46,
    left: 16,
    right: 16,
    zIndex: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    backgroundColor: 'rgba(12,12,12,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.42)',
    shadowColor: '#000000',
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerCount: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,215,0,0.16)',
  },
  headerCountText: { color: '#FFD700', fontFamily: 'Inter-Bold', fontSize: 13 },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 26,
    backgroundColor: '#101010',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255,215,0,0.42)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.42,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -7 },
    elevation: 18,
  },
  sheetHandleArea: { paddingTop: 10, paddingBottom: 14 },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, alignSelf: 'center', backgroundColor: '#777777', marginBottom: 14 },
  sheetHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Inter-Bold' },
  sheetSubtitle: { color: '#A0A0A0', fontSize: 12, fontFamily: 'Inter-Medium', marginTop: 3 },
  locationWarning: { color: '#FFD700', fontSize: 12, fontFamily: 'Inter-Medium', paddingBottom: 10 },
  sheetScroll: { flex: 1 },
  activeScrollContent: { paddingBottom: 24 },
  scrollContent: {
    paddingBottom: 20,
    paddingTop: 8,
  },
  emptyContainer: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#A0A0A0',
    marginTop: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    gap: 8,
  },
  refreshButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  orderCard: {
    backgroundColor: '#1B1B1B',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#343434',
    marginBottom: 12,
  },
  orderHeader: {
    marginBottom: 12,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passengerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#292929',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  passengerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  passengerLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#A0A0A0',
  },
  orderCreated: { color: '#777777', fontSize: 11, fontFamily: 'Inter-Regular', marginTop: 2 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 999 },
  orderRoute: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#35C98A',
    marginRight: 10,
    marginTop: 4,
  },
  routeDotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B6B',
    marginRight: 10,
    marginTop: 4,
  },
  routeConnector: {
    width: 2,
    height: 16,
    backgroundColor: '#484848',
    marginLeft: 4,
    marginVertical: 4,
  },
  routeAddress: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    flex: 1,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#D0D0D0',
  },
  metaPrice: {
    marginLeft: 'auto',
  },
  metaPriceText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFD700',
  },
  acceptButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 8,
  },
  declineButtonText: { color: '#A0A0A0', fontSize: 13, fontFamily: 'Inter-SemiBold' },
  cancelButton: {
    height: 48,
    borderRadius: 15,
    backgroundColor: '#292929',
    borderWidth: 1,
    borderColor: '#454545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cancelButtonText: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold', fontSize: 14 },
  declineButton: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 7, paddingVertical: 8 },
  passengerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#353535',
    marginBottom: 14,
  },
  passengerAvatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  passengerCardInfo: { flex: 1, marginLeft: 14 },
  passengerCardName: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#FFFFFF', marginBottom: 2 },
  passengerCardLabel: { fontSize: 13, fontFamily: 'Inter-Regular', color: '#A0A0A0' },
  callButton: { padding: 4 },
  callButtonInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 14,
  },
  routeLineContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 16,
    paddingTop: 4,
  },
  routeDotPickup: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#35C98A',
    borderWidth: 3,
    borderColor: '#35C98A',
  },
  routeLine: {
    width: 3,
    height: 50,
    backgroundColor: '#484848',
    marginVertical: 6,
    borderRadius: 2,
    overflow: 'hidden',
  },
  routeLineProgress: {
    width: '100%',
    height: '30%',
    backgroundColor: '#FFD700',
  },
  routeDotDropoff: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF6B6B',
    borderWidth: 3,
    borderColor: '#FF6B6B',
  },
  routeDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  routePointDetail: {
    marginBottom: 4,
  },
  routeLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#A0A0A0',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeAddressText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  routeDistanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  routeDistanceText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#D0D0D0',
    marginLeft: 6,
  },
  infoCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#1B1B1B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  infoIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#A0A0A0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  spacer: {
    height: 4,
  },
  actionsContainer: {
    paddingBottom: 8,
  },
  primaryButton: {
    height: 60,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
  },
  primaryButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  primaryButtonText: {
    color: '#111111',
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  secondaryButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
  },
  secondaryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#232323',
    borderWidth: 1,
    borderColor: '#404040',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1B1B1B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  navTurnIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTurnInfo: {
    flex: 1,
    gap: 2,
  },
  navDistance: {
    color: '#FFD700',
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  navStreet: {
    color: '#D0D0D0',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  navSummary: {
    alignItems: 'flex-end',
    gap: 2,
  },
  navSummaryValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  navSummaryLabel: {
    color: '#A0A0A0',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});
