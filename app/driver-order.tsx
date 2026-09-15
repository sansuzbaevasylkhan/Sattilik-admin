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
} from 'lucide-react-native';
import MenuDrawer from '@/components/MenuDrawer';
import { getUser } from '@/store/userStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocationBroadcast } from '@/hooks/useLocationBroadcast';
import RouteMapPreview from '@/components/RouteMapPreview';
import { getRoute } from '@/lib/routing';
import { BG_GRADIENT, BG_DARK, GOLD_GRADIENT } from '@/lib/theme';

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
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);

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

  useEffect(() => {
    const p = activeOrder?.pickup_lat != null && activeOrder?.pickup_lng != null ? activeOrder : null;
    const d = activeOrder?.dropoff_lat != null && activeOrder?.dropoff_lng != null ? activeOrder : null;
    if (!p || !d) {
      setRouteCoordinates(null);
      return;
    }
    let cancelled = false;
    getRoute(p.pickup_lng!, p.pickup_lat!, d.dropoff_lng!, d.dropoff_lat!).then((route) => {
      if (!cancelled) setRouteCoordinates(route.coordinates);
    });
    return () => {
      cancelled = true;
    };
  }, [activeOrder?.id, activeOrder?.pickup_lat, activeOrder?.pickup_lng, activeOrder?.dropoff_lat, activeOrder?.dropoff_lng]);

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
    if (activeOrderStatus === 'completed') return '#22C55E';
    if (activeOrderStatus === 'in_progress') return '#2563EB';
    return '#F59E0B';
  };

  const getStatusText = () => {
    if (activeOrderStatus === 'completed') return t('driverOrder.statusCompleted');
    if (activeOrderStatus === 'in_progress') return t('driverOrder.statusInProgress');
    return t('driverOrder.statusAccepted');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={BG_GRADIENT}
        style={styles.background}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} activeOpacity={0.7}>
          <Menu size={28} color="#FFFFFF" />
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
              tintColor="#FFD700"
            />
          }
        >
          {pendingOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Inbox size={64} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyTitle}>{t('driverOrder.emptyTitle')}</Text>
              <Text style={styles.emptySubtitle}>
                {t('driverOrder.emptySubtitle')}
              </Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={fetchPendingOrders}
                activeOpacity={0.7}
              >
                <RefreshCw size={20} color="#FFD700" />
                <Text style={styles.refreshButtonText}>{t('driverOrder.refreshButton')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            pendingOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.passengerInfo}>
                    <View style={styles.passengerAvatar}>
                      <User size={18} color="#FFFFFF" />
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
                    <Route size={16} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.metaText}>{order.distance}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock size={16} color="rgba(255,255,255,0.4)" />
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
                      <ActivityIndicator color={BG_DARK} size="small" />
                    ) : (
                      <>
                        <Play size={18} color={BG_DARK} fill={BG_DARK} />
                        <Text style={styles.acceptButtonText}>{t('driverOrder.acceptButton')}</Text>
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
              <User size={28} color="#FFFFFF" />
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
                <Phone size={20} color="#FFFFFF" />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {(activeOrder.pickup_lat != null && activeOrder.pickup_lng != null) ||
          (activeOrder.dropoff_lat != null && activeOrder.dropoff_lng != null) ? (
            <RouteMapPreview
              pickup={
                activeOrder.pickup_lat != null && activeOrder.pickup_lng != null
                  ? { lat: activeOrder.pickup_lat, lng: activeOrder.pickup_lng }
                  : null
              }
              dropoff={
                activeOrder.dropoff_lat != null && activeOrder.dropoff_lng != null
                  ? { lat: activeOrder.dropoff_lat, lng: activeOrder.dropoff_lng }
                  : null
              }
              routeCoordinates={routeCoordinates}
            />
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
                <Route size={16} color="rgba(255,255,255,0.4)" />
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
              <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Clock size={20} color="#22C55E" />
              </View>
              <Text style={styles.infoValue}>{activeOrder.estimated_time}</Text>
              <Text style={styles.infoLabel}>{t('driverOrder.timeLabel')}</Text>
            </View>

            <View style={styles.infoCard}>
              <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
                <Wallet size={20} color="#2563EB" />
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
                    <Play size={22} color={BG_DARK} fill={BG_DARK} />
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
                    colors={['#22C55E', '#16A34A']}
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
    ...StyleSheet.absoluteFillObject,
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
    color: '#FFFFFF',
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
    color: 'rgba(255,255,255,0.5)',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.3)',
    marginTop: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 12,
    gap: 8,
  },
  refreshButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFD700',
  },
  orderCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
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
    color: 'rgba(255,255,255,0.4)',
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
    backgroundColor: '#22C55E',
    marginRight: 10,
    marginTop: 4,
  },
  routeDotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginRight: 10,
    marginTop: 4,
  },
  routeConnector: {
    width: 2,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginLeft: 4,
    marginVertical: 4,
  },
  routeAddress: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.8)',
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
    color: 'rgba(255,255,255,0.5)',
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
    color: BG_DARK,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  passengerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  passengerAvatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  passengerCardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  passengerCardName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  passengerCardLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.5)',
  },
  callButton: {
    padding: 4,
  },
  callButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  routeLine: {
    width: 3,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
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
    backgroundColor: '#EF4444',
    borderWidth: 3,
    borderColor: 'rgba(239, 68, 68, 0.3)',
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
    color: 'rgba(255,255,255,0.4)',
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
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 6,
  },
  infoCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    color: 'rgba(255,255,255,0.4)',
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
    color: BG_DARK,
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#FFD700',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
});
