import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
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
  Timer,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  RotateCcw,
  Flag,
} from 'lucide-react-native';
import MenuDrawer from '@/components/MenuDrawer';
import { getUser } from '@/store/userStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocationBroadcast } from '@/hooks/useLocationBroadcast';
import RouteMapPreview from '@/components/RouteMapPreview';
import { getRoute, getRouteProgress, RouteProgress, RouteResult, RouteStep } from '@/lib/routing';
import { invokePushEvent } from '@/lib/notifications';
import { BG_GRADIENT, GOLD_GRADIENT } from '@/lib/theme';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const abbrev = (firstName: string, lastName: string) => {
  const l = lastName?.trim();
  return `${firstName}${l ? ' ' + l[0].toUpperCase() + '.' : ''}`;
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
}



export default function DriverOrderScreen() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ScreenMode>('list');
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [activeOrderStatus, setActiveOrderStatus] = useState<'accepted' | 'in_progress' | 'completed'>('accepted');

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeProgress, setRouteProgress] = useState<RouteProgress | null>(null);
  const [driverPos, setDriverPos] = useState<{ lng: number; lat: number; bearing: number } | null>(null);

  const lastRerouteRef = useRef(0);
  const arrivedNotifiedRef = useRef<string | null>(null);

  useLocationBroadcast(
    getUser().phone || null,
    mode === 'active' && (activeOrderStatus === 'accepted' || activeOrderStatus === 'in_progress'),
  );

  const acceptButtonScale = useRef(new Animated.Value(1)).current;
  const completeButtonScale = useRef(new Animated.Value(1)).current;
  const callButtonScale = useRef(new Animated.Value(1)).current;
  const navButtonScale = useRef(new Animated.Value(1)).current;

  const fetchPendingOrders = useCallback(async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?status=eq.pending&order=created_at.desc`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      const orders: Order[] = await res.json();
      setPendingOrders(orders || []);
    } catch (e) {
      console.error('Fetch error:', e);
    }
  }, []);

  const fetchActiveOrder = useCallback(async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?status=in.(accepted,in_progress)&driver_phone=eq.${getUser().phone}&order=created_at.desc&limit=1`,
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

  useEffect(() => {
    fetchActiveOrder();
    fetchPendingOrders();
    const interval = setInterval(fetchPendingOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchActiveOrder, fetchPendingOrders]);

  const pickupPoint =
    activeOrder && activeOrder.pickup_lat != null && activeOrder.pickup_lng != null
      ? { lat: activeOrder.pickup_lat, lng: activeOrder.pickup_lng }
      : null;
  const dropoffPoint =
    activeOrder && activeOrder.dropoff_lat != null && activeOrder.dropoff_lng != null
      ? { lat: activeOrder.dropoff_lat, lng: activeOrder.dropoff_lng }
      : null;

  // Нақты GPS: орналасу мен қозғалыс бағыты үнемі жаңарып отырады.
  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    const start = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 10 },
        (pos) => {
          const heading = pos.coords.heading;
          setDriverPos({
            lng: pos.coords.longitude,
            lat: pos.coords.latitude,
            bearing: typeof heading === 'number' && heading >= 0 ? heading : 0,
          });
        },
      );
    };

    start();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  // Қабылданғанда — жолаушыға дейін, жолда — межелі орынға дейін нақты маршрут.
  useEffect(() => {
    if (!activeOrder) {
      setRoute(null);
      return;
    }

    let from: { lat: number; lng: number } | null = null;
    let to: { lat: number; lng: number } | null = null;

    if (activeOrderStatus === 'accepted') {
      from = driverPos ? { lat: driverPos.lat, lng: driverPos.lng } : pickupPoint;
      if (driverPos) {
        to = pickupPoint;
      } else if (pickupPoint && dropoffPoint) {
        // GPS әлі келмесе — алдын ала толық маршрутты көрсетеміз.
        to = dropoffPoint;
      }
    } else if (activeOrderStatus === 'in_progress') {
      from = driverPos ? { lat: driverPos.lat, lng: driverPos.lng } : pickupPoint;
      to = dropoffPoint;
    }

    if (!from || !to) {
      setRoute(null);
      return;
    }

    let cancelled = false;
    lastRerouteRef.current = Date.now();
    getRoute(from.lng, from.lat, to.lng, to.lat).then((result) => {
      if (!cancelled) setRoute(result);
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeOrder?.id,
    activeOrderStatus,
    !!driverPos,
    pickupPoint?.lat,
    pickupPoint?.lng,
    dropoffPoint?.lat,
    dropoffPoint?.lng,
  ]);

  // Ағымдағы орын бойынша қалған жол, келесі бұрылыс және ETA.
  useEffect(() => {
    if (!route || !driverPos) {
      setRouteProgress(null);
      return;
    }
    setRouteProgress(getRouteProgress(route, driverPos.lng, driverPos.lat));
  }, [route, driverPos]);

  // Маршруттан 60 м-ден көп ауытқыса — 15 секундтан кейін қайта есептеу.
  useEffect(() => {
    if (!driverPos || !activeOrder || !routeProgress) return;
    if (activeOrderStatus !== 'accepted' && activeOrderStatus !== 'in_progress') return;
    if (routeProgress.distanceToRouteM < 60) return;

    const destination = activeOrderStatus === 'accepted' ? pickupPoint : dropoffPoint;
    if (!destination) return;

    const now = Date.now();
    if (now - lastRerouteRef.current < 15000) return;
    lastRerouteRef.current = now;

    let cancelled = false;
    getRoute(driverPos.lng, driverPos.lat, destination.lng, destination.lat).then((result) => {
      if (!cancelled) setRoute(result);
    });

    return () => {
      cancelled = true;
    };
  }, [
    driverPos,
    routeProgress?.distanceToRouteM,
    activeOrder?.id,
    activeOrderStatus,
    pickupPoint?.lat,
    pickupPoint?.lng,
    dropoffPoint?.lat,
    dropoffPoint?.lng,
  ]);

  // Жолаушыға «жүргізуші келді» push хабарын бір рет жіберу.
  useEffect(() => {
    if (!activeOrder || activeOrderStatus !== 'accepted' || !routeProgress) return;
    if (arrivedNotifiedRef.current === activeOrder.id) return;
    if (routeProgress.remainingM > 150) return;

    arrivedNotifiedRef.current = activeOrder.id;
    invokePushEvent('driver_arrived', { orderId: activeOrder.id });
  }, [activeOrder?.id, activeOrderStatus, routeProgress?.remainingM]);

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
    await fetchPendingOrders();
    await fetchActiveOrder();
    setRefreshing(false);
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
        `${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            status: 'accepted',
            driver_phone: getUser().phone,
            driver_first_name: getUser().firstName,
            driver_last_name: getUser().lastName,
          }),
        }
      );
      if (res.ok) {
        setActiveOrder({ ...order, status: 'accepted' });
        setActiveOrderStatus('accepted');
        setMode('active');
        setPendingOrders(prev => prev.filter(o => o.id !== order.id));
        invokePushEvent('order_accepted', { orderId: order.id });
      } else {
        Alert.alert(t('driverOrder.errorAcceptTitle'), t('driverOrder.errorAcceptOrderMessage'));
      }
    } catch {
      Alert.alert(t('driverOrder.errorAcceptTitle'), t('driverOrder.errorNetworkMessage'));
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrip = () => {
    animatePress(acceptButtonScale, async () => {
      if (!activeOrder) return;
      try {
        await fetch(
          `${SUPABASE_URL}/rest/v1/orders?id=eq.${activeOrder.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ status: 'in_progress' }),
          }
        );
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
        await fetch(
          `${SUPABASE_URL}/rest/v1/orders?id=eq.${activeOrder.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ status: 'completed' }),
          }
        );
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

  const getStatusColor = () => {
    if (activeOrderStatus === 'completed') return '#000000';
    if (activeOrderStatus === 'in_progress') return '#0066FF';
    return '#000000';
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
      <LinearGradient
        colors={BG_GRADIENT}
        style={styles.background}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} activeOpacity={0.7}>
          <Menu size={28} color="#000000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {mode === 'active' ? t('driverOrder.headerTitleActive') : t('driverOrder.headerTitleList')}
          </Text>
          {mode === 'active' && (
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
          )}
        </View>
        <View style={{ width: 28 }} />
      </View>

      {mode === 'list' && (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#000000"
            />
          }
        >
          {pendingOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Inbox size={64} color="rgba(0, 0, 0, 0.55)" />
              <Text style={styles.emptyTitle}>{t('driverOrder.emptyTitle')}</Text>
              <Text style={styles.emptySubtitle}>
                {t('driverOrder.emptySubtitle')}
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
                      <User size={18} color="#000000" />
                    </View>
                    <View>
                      <Text style={styles.passengerName}>
                        {abbrev(order.passenger_first_name, order.passenger_last_name)}
                      </Text>
                      <Text style={styles.passengerLabel}>{t('driverOrder.passengerLabel')}</Text>
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
                    <Route size={16} color="rgba(0, 0, 0, 0.55)" />
                    <Text style={styles.metaText}>{order.distance}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock size={16} color="rgba(0, 0, 0, 0.55)" />
                    <Text style={styles.metaText}>{order.estimated_time}</Text>
                  </View>
                  <View style={styles.metaPrice}>
                    <Text style={styles.metaPriceText}>{order.price} ₸</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptOrder(order)}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={GOLD_GRADIENT}
                    style={styles.acceptButtonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color={'#FFFFFF'} size="small" />
                    ) : (
                      <>
                        <Play size={18} color={'#FFFFFF'} fill={'#FFFFFF'} />
                        <Text style={styles.acceptButtonText}>{t('driverOrder.acceptButton')}</Text>
                        {order.expires_at && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Timer size={14} color={'#FFFFFF'} />
                          <Text style={{ fontSize: 12, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' }}>
                            {Math.max(0, Math.ceil((new Date(order.expires_at).getTime() - new Date().getTime()) / 1000))}с</Text>
                        </View>
                        )}
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {mode === 'active' && activeOrder && (
        <View style={styles.content}>
          <View style={styles.passengerCard}>
            <View style={styles.passengerAvatarLarge}>
              <User size={28} color="#000000" />
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

          {(pickupPoint || dropoffPoint) ? (
            <RouteMapPreview
              pickup={pickupPoint}
              dropoff={dropoffPoint}
              driver={driverPos}
              routeCoordinates={route?.coordinates ?? null}
            />
          ) : null}

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
              <View style={[styles.infoIconCircle, { backgroundColor: '#FFC800' }]}>
                <Clock size={20} color="#000000" />
              </View>
              <Text style={styles.infoValue}>{activeOrder.estimated_time}</Text>
              <Text style={styles.infoLabel}>{t('driverOrder.timeLabel')}</Text>
            </View>

            <View style={styles.infoCard}>
              <View style={[styles.infoIconCircle, { backgroundColor: '#0066FF' }]}>
                <Wallet size={20} color="#FFFFFF" />
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
                    <Play size={22} color={'#FFFFFF'} fill={'#FFFFFF'} />
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
                    colors={['#0066FF', '#0052CC']}
                    style={styles.primaryButtonGradient}
                  >
                    <CheckCircle size={22} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>{t('driverOrder.completeOrderButton')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            )}

            <View style={styles.secondaryButtons}>
              <Animated.View style={[styles.secondaryButton, { transform: [{ scale: navButtonScale }] }]}>
                <TouchableOpacity
                  style={styles.secondaryButtonInner}
                  onPress={() => handleOpenNavigation(activeOrder.pickup_address)}
                  activeOpacity={0.7}
                >
                  <Navigation size={20} color="#000000" />
                  <Text style={styles.secondaryButtonText}>{t('driverOrder.navigationButton')}</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={[styles.secondaryButton, { transform: [{ scale: callButtonScale }] }]}>
                <TouchableOpacity
                  style={styles.secondaryButtonInner}
                  onPress={() => handleCallPassenger(activeOrder.passenger_phone)}
                  activeOpacity={0.7}
                >
                  <Phone size={20} color="#000000" />
                  <Text style={styles.secondaryButtonText}>{t('driverOrder.callButton')}</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </View>
      )}

      <MenuDrawer visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFill,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 6,
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(0, 0, 0, 0.55)',
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
    backgroundColor: '#FFC800',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
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
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  passengerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  passengerLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(0, 0, 0, 0.55)',
  },
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
    backgroundColor: '#FFC800',
    marginRight: 10,
    marginTop: 4,
  },
  routeDotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFC800',
    marginRight: 10,
    marginTop: 4,
  },
  routeConnector: {
    width: 2,
    height: 16,
    backgroundColor: '#FFC800',
    marginLeft: 4,
    marginVertical: 4,
  },
  routeAddress: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
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
    color: '#000000',
  },
  metaPrice: {
    marginLeft: 'auto',
  },
  metaPriceText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#000000',
  },
  acceptButton: {
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
  },
  acceptButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  passengerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFC800',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
    marginBottom: 16,
  },
  passengerAvatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  passengerCardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  passengerCardName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 2,
  },
  passengerCardLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  callButton: {
    padding: 4,
  },
  callButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFC800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFC800',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D4AF37',
    marginBottom: 16,
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
    backgroundColor: '#FFC800',
    borderWidth: 3,
    borderColor: '#D4AF37',
  },
  routeLine: {
    width: 3,
    height: 50,
    backgroundColor: '#FFC800',
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
    backgroundColor: '#FFC800',
    borderWidth: 3,
    borderColor: '#D4AF37',
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
    color: 'rgba(0, 0, 0, 0.55)',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeAddressText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  routeDistanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  routeDistanceText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginLeft: 6,
  },
  infoCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#FFC800',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
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
    color: '#000000',
    marginBottom: 2,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(0, 0, 0, 0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  spacer: {
    flex: 1,
  },
  actionsContainer: {
    paddingBottom: 40,
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
    color: '#FFFFFF',
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
    backgroundColor: '#FFC800',
    borderWidth: 1,
    borderColor: '#D4AF37',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#000000',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFC800',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  navTurnIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTurnInfo: {
    flex: 1,
    gap: 2,
  },
  navDistance: {
    color: '#000000',
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  navStreet: {
    color: 'rgba(0, 0, 0, 0.7)',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  navSummary: {
    alignItems: 'flex-end',
    gap: 2,
  },
  navSummaryValue: {
    color: '#000000',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  navSummaryLabel: {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});
