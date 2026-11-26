import React, { useState, useRef, useEffect, useCallback } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Navigation, Menu, DollarSign, Clock, CheckCircle, Share2, MessageCircle, Phone, Star, CarFront } from 'lucide-react-native';
import { router } from 'expo-router';
import MenuDrawer from '@/components/MenuDrawer';
import { getUser } from '@/store/userStore';
import { useTranslation } from '@/hooks/useTranslation';
import { subscribeMapPick } from '@/store/mapPickStore';
import { getRoute } from '@/lib/routing';
import { invokePushEvent } from '@/lib/notifications';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { useTripShare } from '@/hooks/useTripShare';
import RouteMapPreview from '@/components/RouteMapPreview';
import { BG_GRADIENT, BG_DARK, BG_MID, BG_DEEP, GOLD_GRADIENT, GOLD_GRADIENT_DISABLED, GOLD_FOCUSED_BORDER, GOLD_FOCUSED_FILL, GOLD_MEDIUM_FILL, GOLD_MEDIUM_BORDER } from '@/lib/theme';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const abbrev = (firstName: string, lastName: string) => {
  const l = lastName?.trim();
  return `${firstName}${l ? ' ' + l[0].toUpperCase() + '.' : ''}`;
};

type OrderStatus = 'form' | 'searching' | 'accepted' | 'in_progress' | 'completed';

interface Driver {
  first_name: string;
  last_name: string;
  phone: string;
  avatar_url?: string | null;
  car_name?: string | null;
  car_number?: string | null;
  car_color?: string | null;
  average_rating?: number | null;
  reviews_count?: number | null;
}

interface Order {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  price: number;
  status: string;
  driver_phone?: string;
  driver_first_name?: string;
  driver_last_name?: string;
}

export default function OrderScreen() {
  const { t } = useTranslation();
  const { shareTrip } = useTripShare();
  const [pointA, setPointA] = useState('');
  const [pointB, setPointB] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [price, setPrice] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('form');
  const [loading, setLoading] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const [buttonScale] = useState(() => new Animated.Value(1));
  const [searchPulse] = useState(() => new Animated.Value(0.5));

  const alreadyRoutedRef = useRef(false);
  const lastRoutedOrderIdRef = useRef<string | null>(null);


  const getStatusText = () => {
    switch (orderStatus) {
      case 'searching':
        return t('order.statusSearching');
      case 'accepted':
        return t('order.statusAccepted');
      case 'in_progress':
        return t('order.statusInProgress');
      case 'completed':
        return t('order.statusCompleted');
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (orderStatus) {
      case 'searching':
        return '#000000';
      case 'accepted':
        return '#000000';
      case 'in_progress':
        return '#0066FF';
      case 'completed':
        return '#000000';
      default:
        return '#000000';
    }
  };

  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);
  const liveDriverLocation = useDriverLocation(driver?.phone ?? null);

  useEffect(() => {
    if (!driver?.phone) return;
    let cancelled = false;
    const query = new URLSearchParams({
      select: 'avatar_url,car_name,car_number,car_color,average_rating,reviews_count',
      phone: `eq.${driver.phone}`,
    });
    fetch(`${SUPABASE_URL}/rest/v1/users?${query}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    })
      .then(async (response) => response.ok ? response.json() : [])
      .then((rows: Partial<Driver>[]) => {
        if (cancelled || !rows[0]) return;
        setDriver((current) => current?.phone === driver.phone ? { ...current, ...rows[0] } : current);
      })
      .catch((error) => console.warn('Driver profile lookup failed:', error));
    return () => { cancelled = true; };
  }, [driver?.phone]);

  useEffect(() => {
    const unsub = subscribeMapPick((result) => {
      if (result.field === 'pickup') {
        setPointA(result.address);
        setPickupCoords({ lng: result.lng, lat: result.lat });
      } else {
        setPointB(result.address);
        setDropoffCoords({ lng: result.lng, lat: result.lat });
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!pickupCoords || !dropoffCoords) {
      const reset = setTimeout(() => {
        setRouteInfo(null);
        setRouteCoordinates(null);
      }, 0);
      return () => clearTimeout(reset);
    }
    let cancelled = false;
    getRoute(pickupCoords.lng, pickupCoords.lat, dropoffCoords.lng, dropoffCoords.lat).then((route) => {
      if (!cancelled) {
        setRouteInfo({ distanceKm: route.distanceKm, durationMin: route.durationMin });
        setRouteCoordinates(route.coordinates);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pickupCoords, dropoffCoords]);

  useEffect(() => {
    if (orderStatus !== 'searching') return;

    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(searchPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(searchPulse, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnim.start();
    return () => pulseAnim.stop();
  }, [orderStatus, searchPulse]);

  const fetchOrderById = useCallback(async (id: string) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}&select=*`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!res.ok) throw new Error('Order fetch failed');
    const orders: Order[] = await res.json();
    return orders?.[0] || null;
  }, []);

  useEffect(() => {
    if (orderStatus !== 'searching' || !currentOrder) return;

    const interval = setInterval(async () => {
      try {
        const order = await fetchOrderById(currentOrder.id);
        if (!order) return;

        if (order.status === 'accepted' && order.driver_phone) {
          setCurrentOrder(order);
          setDriver({
            first_name: order.driver_first_name || '',
            last_name: order.driver_last_name || '',
            phone: order.driver_phone,
          });
          setOrderStatus('accepted');
          return;
        }

        if (order.status === 'in_progress') {
          setCurrentOrder(order);
          setDriver({
            first_name: order.driver_first_name || '',
            last_name: order.driver_last_name || '',
            phone: order.driver_phone || '',
          });
          setOrderStatus('in_progress');
          return;
        }

        if (order.status === 'completed') {
          setCurrentOrder(order);
          setOrderStatus('completed');

          // One-time auto navigation to rating screen
          if (!alreadyRoutedRef.current && order.id) {
            const currentId = order.id;
            if (lastRoutedOrderIdRef.current !== currentId) {
              alreadyRoutedRef.current = true;
              lastRoutedOrderIdRef.current = currentId;
              router.push({
                pathname: '/rate-driver',
                params: { orderId: currentId },
              });
            }
          }

          clearInterval(interval);
        }
      } catch (e) {
        console.error('Poll error:', e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderStatus, currentOrder, fetchOrderById]);

  const handleOrder = () => {
    if (!pointA.trim()) {
      Alert.alert(t('common.warning'), t('order.errorPickupRequired'));
      return;
    }
    if (!pointB.trim()) {
      Alert.alert(t('common.warning'), t('order.errorDropoffRequired'));
      return;
    }

    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      setLoading(true);
      try {
        const user = getUser();

        const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            passenger_phone: user.phone || 'guest',
            passenger_first_name: user.firstName || 'Қонақ',
            passenger_last_name: user.lastName || '',
            pickup_address: pointA,
            dropoff_address: pointB,
            pickup_lat: pickupCoords?.lat ?? null,
            pickup_lng: pickupCoords?.lng ?? null,
            dropoff_lat: dropoffCoords?.lat ?? null,
            dropoff_lng: dropoffCoords?.lng ?? null,
            price: parseInt(price) || 0,
            distance: routeInfo ? `${routeInfo.distanceKm} км` : '5 км',
            estimated_time: routeInfo ? `${routeInfo.durationMin} мин` : '15 мин',
            status: 'pending',
            payment_method: paymentMethod,
            passenger_reviewed: false,
          }),
        });

        if (!res.ok) {
          const errorBody = await res.text();
          console.error('Order create failed:', res.status, errorBody);
          throw new Error(`Order create failed: ${res.status}`);
        }

        const orders: Order[] = await res.json();
        if (!orders || orders.length === 0) {
          console.error('Order create returned no row');
          throw new Error('Order create returned no row');
        }

        setCurrentOrder(orders[0]);
        setOrderStatus('searching');
        Alert.alert(t('order.successTitle'), t('order.successOrderCreated'));
        invokePushEvent('new_order', { orderId: orders[0].id });
      } catch (e) {
        Alert.alert(t('common.error'), t('order.errorOrderFailed'));
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
  };

  const handleNewOrder = () => {
    setPointA('');
    setPointB('');
    setPrice('');
    setCurrentOrder(null);
    setDriver(null);
    setOrderStatus('form');
  };

  const isLiveTrip = orderStatus === 'accepted' || orderStatus === 'in_progress';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
    >
      <LinearGradient
        colors={BG_GRADIENT}
        style={styles.background}
      />

      {orderStatus === 'form' && (
        <View style={styles.formMapLayer}>
          <RouteMapPreview
            fill
            pickup={pickupCoords}
            dropoff={dropoffCoords}
            routeCoordinates={routeCoordinates}
          />
        </View>
      )}

      {isLiveTrip && (
        <View style={styles.liveMapScreen}>
          <RouteMapPreview
            fill
            pickup={pickupCoords}
            dropoff={dropoffCoords}
            routeCoordinates={routeCoordinates}
            driver={liveDriverLocation}
          />

          <View style={styles.liveTripStatus}>
            <Text style={styles.liveTripStatusText}>{getStatusText()}</Text>
          </View>

          <View style={styles.liveTripPanel}>
            <View style={styles.liveTripPanelHandle} />
            <ScrollView
              contentContainerStyle={styles.liveTripPanelContent}
              showsVerticalScrollIndicator={false}
            >
              {driver && (
                <View style={styles.liveDriverCard}>
                  <View style={styles.liveDriverTopRow}>
                    {driver.avatar_url ? (
                      <Image source={{ uri: driver.avatar_url }} style={styles.liveDriverAvatar} />
                    ) : (
                      <View style={[styles.liveDriverAvatar, styles.liveDriverAvatarFallback]}>
                        <Text style={styles.liveDriverAvatarText}>{driver.first_name?.[0] || '?'}</Text>
                      </View>
                    )}
                    <View style={styles.liveDriverIdentity}>
                      <View style={styles.liveDriverNameRow}>
                        <Text style={styles.liveDriverName} numberOfLines={1}>{abbrev(driver.first_name, driver.last_name)}</Text>
                        <View style={styles.liveDriverRating}>
                          <Star size={16} color="#D99B00" fill="#D99B00" />
                          <Text style={styles.liveDriverRatingText}>
                            {driver.average_rating && driver.average_rating > 0 ? Number(driver.average_rating).toFixed(1) : t('tripChat.newDriver')}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.liveDriverCar} numberOfLines={1}>
                        {[driver.car_color, driver.car_name].filter(Boolean).join(' ') || t('tripChat.carInfoPending')}
                      </Text>
                    </View>
                    <View style={styles.liveCarIcon}>
                      <CarFront size={36} color="#536273" />
                    </View>
                  </View>

                  {driver.car_number ? (
                    <View style={styles.livePlate}>
                      <View style={styles.livePlateCountry}>
                        <Text style={styles.livePlateCountryText}>KZ</Text>
                      </View>
                      <Text style={styles.livePlateNumber}>{driver.car_number}</Text>
                    </View>
                  ) : null}

                  <View style={styles.liveDriverActions}>
                    <TouchableOpacity
                      style={[styles.liveActionButton, styles.liveChatButton]}
                      onPress={() => {
                        if (!currentOrder?.id) return;
                        router.push({
                          pathname: '/trip-chat',
                          params: {
                            orderId: currentOrder.id,
                            peerName: abbrev(driver.first_name, driver.last_name),
                            peerPhone: driver.phone,
                          },
                        });
                      }}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={t('tripChat.openChat')}
                    >
                      <MessageCircle size={19} color="#FFFFFF" />
                      <Text style={styles.liveActionText}>{t('tripChat.chat')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.liveActionButton, styles.liveCallButton]}
                      onPress={() => {
                        if (!driver.phone) {
                          Alert.alert(t('common.info'), t('order.errorNoDriverPhone'));
                          return;
                        }
                        Linking.openURL(`tel:${driver.phone}`);
                      }}
                      activeOpacity={0.7}
                    >
                      <Phone size={18} color="#FFFFFF" />
                      <Text style={styles.liveActionText}>{t('tripChat.call')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.liveShareButton}
                      onPress={async () => {
                        if (!currentOrder?.id) return;
                        try {
                          await shareTrip(currentOrder.id);
                        } catch {
                          Alert.alert(t('common.error'), t('order.errorShareFailed'));
                        }
                      }}
                      activeOpacity={0.7}
                      accessibilityLabel={t('tripChat.shareTrip')}
                    >
                      <Share2 size={19} color="#25364B" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {currentOrder && (
                <View style={styles.liveOrderDetailsCard}>
                  <View style={styles.orderRouteRow}>
                    <View style={styles.orderRouteDot} />
                    <Text style={styles.orderRouteText} numberOfLines={2}>{currentOrder.pickup_address}</Text>
                  </View>
                  <View style={styles.orderRouteConnector} />
                  <View style={styles.orderRouteRow}>
                    <View style={[styles.orderRouteDot, styles.orderRouteDotRed]} />
                    <Text style={styles.orderRouteText} numberOfLines={2}>{currentOrder.dropoff_address}</Text>
                  </View>
                  <View style={styles.orderPriceRow}>
                    <Text style={styles.orderPriceLabel}>{t('order.priceLabel')}</Text>
                    <Text style={styles.orderPriceValue}>{currentOrder.price} ₸</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      <View style={
        orderStatus === 'form'
          ? styles.floatingHeader
          : isLiveTrip
            ? styles.liveMapHeader
            : styles.header
      }>
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
          style={orderStatus === 'form' ? styles.floatingMenuButton : isLiveTrip ? styles.liveMapMenuButton : undefined}
        >
          <Menu size={orderStatus === 'form' ? 22 : 28} color={isLiveTrip ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
        {orderStatus !== 'form' && (
          <>
            <Text style={isLiveTrip ? styles.liveMapHeaderTitle : styles.headerTitle}>{t('order.headerTitleActive')}</Text>
            <View style={{ width: 28 }} />
          </>
        )}
      </View>

      {orderStatus === 'form' && (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <ScrollView
            contentContainerStyle={styles.sheetScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.routeCard}>
              <View style={styles.routeLineContainer}>
                <View style={styles.routeDotA} />
                <View style={styles.routeLine} />
                <View style={styles.routeDotB} />
              </View>

              <View style={styles.inputsContainer}>
                <View
                  style={[styles.inputWrapper, focusedField === 'A' && styles.inputWrapperFocused]}
                >
                  <MapPin
                    size={20}
                    color={focusedField === 'A' ? '#000000' : 'rgba(0, 0, 0, 0.55)'}
                  />
                  <TextInput
                    style={styles.input}
                    value={pointA}
                    onChangeText={(text) => {
                      setPointA(text);
                      setPickupCoords(null);
                    }}
                    placeholder={t('order.pickupPlaceholder')}
                    placeholderTextColor="rgba(0, 0, 0, 0.55)"
                    onFocus={() => setFocusedField('A')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: '/map-picker',
                        params: {
                          field: 'pickup',
                          ...(dropoffCoords
                            ? { otherLat: String(dropoffCoords.lat), otherLng: String(dropoffCoords.lng) }
                            : {}),
                        },
                      })
                    }
                    activeOpacity={0.7}
                    hitSlop={8}
                  >
                    <Navigation size={18} color="#000000" />
                  </TouchableOpacity>
                </View>

                <View
                  style={[styles.inputWrapper, focusedField === 'B' && styles.inputWrapperFocused]}
                >
                  <Navigation
                    size={20}
                    color={focusedField === 'B' ? '#000000' : 'rgba(0, 0, 0, 0.55)'}
                  />
                  <TextInput
                    style={styles.input}
                    value={pointB}
                    onChangeText={(text) => {
                      setPointB(text);
                      setDropoffCoords(null);
                    }}
                    placeholder={t('order.dropoffPlaceholder')}
                    placeholderTextColor="rgba(0, 0, 0, 0.55)"
                    onFocus={() => setFocusedField('B')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: '/map-picker',
                        params: {
                          field: 'dropoff',
                          ...(pickupCoords
                            ? { otherLat: String(pickupCoords.lat), otherLng: String(pickupCoords.lng) }
                            : {}),
                        },
                      })
                    }
                    activeOpacity={0.7}
                    hitSlop={8}
                  >
                    <Navigation size={18} color="#000000" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {routeInfo && (
              <Text style={styles.routeInfoText}>
                {routeInfo.distanceKm} км · {routeInfo.durationMin} мин
              </Text>
            )}

            <View
              style={[styles.priceCard, focusedField === 'price' && styles.priceCardFocused]}
            >
              <View style={styles.priceHeader}>
                <DollarSign
                  size={20}
                  color={focusedField === 'price' ? '#000000' : 'rgba(0, 0, 0, 0.55)'}
                />
                <Text style={styles.priceLabel}>{t('order.priceLabel')}</Text>
              </View>

              <View style={styles.priceInputRow}>
                <TextInput
                  style={styles.priceInput}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0"
                  placeholderTextColor="rgba(0, 0, 0, 0.55)"
                  keyboardType="number-pad"
                  onFocus={() => setFocusedField('price')}
                  onBlur={() => setFocusedField(null)}
                />
                <Text style={styles.currencySymbol}>₸</Text>
              </View>
            </View>

            <View
              style={[styles.paymentCard, focusedField === 'payment' && styles.paymentCardFocused]}
            >
              <View style={styles.paymentHeader}>
                <Text style={styles.paymentLabel}>{t('order.paymentLabel')}</Text>
              </View>

              <View style={styles.paymentButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.paymentButton,
                    paymentMethod === 'cash' && styles.paymentButtonSelected,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setPaymentMethod('cash')}
                >
                  <Text style={styles.paymentButtonText}>{t('order.paymentCash')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentButton,
                    paymentMethod === 'card' && styles.paymentButtonSelected,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setPaymentMethod('card')}
                >
                  <Text style={styles.paymentButtonText}>{t('order.paymentCard')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.spacer} />

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[styles.orderButton, loading && styles.orderButtonDisabled]}
                onPress={handleOrder}
                activeOpacity={0.8}
                disabled={loading}
              >
                <LinearGradient
                  colors={loading ? GOLD_GRADIENT_DISABLED : GOLD_GRADIENT}
                  style={styles.orderButtonGradient}
                >
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.orderButtonText}>{t('order.orderButton')}</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </View>
      )}

      {(orderStatus === 'searching' || orderStatus === 'completed') && (
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
          <View style={styles.statusContainer}>
            <Animated.View
              style={[styles.statusIndicator, { opacity: orderStatus === 'searching' ? searchPulse : 1 }]}
            >
              {orderStatus === 'searching' ? (
                <Clock size={48} color={getStatusColor()} />
              ) : (
                <CheckCircle size={48} color={getStatusColor()} />
              )}
            </Animated.View>

            <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>

            {(pickupCoords || dropoffCoords) && (
              <RouteMapPreview
                pickup={pickupCoords}
                dropoff={dropoffCoords}
                routeCoordinates={routeCoordinates}
              />
            )}

            {currentOrder && (
              <View style={styles.orderDetailsCard}>
                <View style={styles.orderRouteRow}>
                  <View style={styles.orderRouteDot} />
                  <Text style={styles.orderRouteText}>{currentOrder.pickup_address}</Text>
                </View>
                <View style={styles.orderRouteConnector} />
                <View style={styles.orderRouteRow}>
                  <View style={[styles.orderRouteDot, styles.orderRouteDotRed]} />
                  <Text style={styles.orderRouteText}>{currentOrder.dropoff_address}</Text>
                </View>
                <View style={styles.orderPriceRow}>
                  <Text style={styles.orderPriceLabel}>{t('order.priceLabel')}</Text>
                  <Text style={styles.orderPriceValue}>{currentOrder.price} ₸</Text>
                </View>
              </View>
            )}

            <View style={styles.spacer} />

            {orderStatus === 'completed' ? (
              <View style={{ width: '100%', gap: 12 }}>
                <TouchableOpacity
                  style={styles.newOrderButton}
                  onPress={() => {
                    if (!currentOrder?.id) return;
                    router.push({
                      pathname: '/rate-driver',
                      params: { orderId: currentOrder.id },
                    });
                  }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={GOLD_GRADIENT}
                    style={styles.newOrderButtonGradient}
                  >
                    <Text style={styles.newOrderButtonText}>{t('order.reviewButton')}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.newOrderButton}
                  onPress={handleNewOrder}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={GOLD_GRADIENT}
                    style={styles.newOrderButtonGradient}
                  >
                    <Text style={styles.newOrderButtonText}>{t('order.newOrderButton')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : null}


          </View>
      </ScrollView>
      )}


      <MenuDrawer visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFill,
  },
  liveMapScreen: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  liveMapHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    paddingTop: 54,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveMapMenuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,17,17,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
  },
  liveMapHeaderTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowRadius: 6,
  },
  liveTripStatus: {
    position: 'absolute',
    top: 112,
    left: 20,
    zIndex: 4,
    maxWidth: '72%',
    backgroundColor: 'rgba(17,17,17,0.88)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
  },
  liveTripStatusText: {
    color: '#FFD700',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  liveTripPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 4,
    height: '52%',
    backgroundColor: '#FFD700',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#D4AF37',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'web' ? 12 : 28,
  },
  liveTripPanelHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#B8860B',
    alignSelf: 'center',
    marginBottom: 12,
  },
  liveTripPanelContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  liveDriverCard: {
    width: '100%',
    backgroundColor: '#FFE45C',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
    gap: 12,
    shadowColor: '#142033',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  liveDriverTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveDriverAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  liveDriverAvatarFallback: {
    backgroundColor: '#FFEFA3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDriverAvatarText: {
    color: '#000000',
    fontSize: 22,
    fontFamily: 'Inter-Bold',
  },
  liveDriverIdentity: {
    flex: 1,
    minWidth: 0,
  },
  liveDriverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDriverName: {
    flexShrink: 1,
    color: '#000000',
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  liveDriverRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  liveDriverRatingText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  liveDriverCar: {
    color: '#000000',
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  liveCarIcon: {
    width: 58,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFEFA3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePlate: {
    minHeight: 48,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1F2937',
    borderRadius: 9,
    overflow: 'hidden',
  },
  livePlateCountry: {
    alignSelf: 'stretch',
    minWidth: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF2FA',
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
  },
  livePlateCountryText: {
    color: '#0F4C81',
    fontSize: 13,
    fontFamily: 'Inter-Bold',
  },
  livePlateNumber: {
    color: '#111827',
    paddingHorizontal: 12,
    fontSize: 21,
    letterSpacing: 1,
    fontFamily: 'Inter-Bold',
  },
  liveDriverActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveActionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  liveChatButton: {
    backgroundColor: '#1769E0',
  },
  liveCallButton: {
    backgroundColor: '#0F5BC5',
  },
  liveActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  liveShareButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEFA3',
  },
  liveOrderDetailsCard: {
    width: '100%',
    backgroundColor: '#FFC800',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  contentScroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  formMapLayer: {
    ...StyleSheet.absoluteFill,
  },
  floatingHeader: {
    position: 'absolute',
    top: 56,
    left: 20,
    zIndex: 10,
  },
  floatingMenuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFC800',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.18)',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '62%',
    backgroundColor: BG_DEEP,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#D4AF37',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFC800',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  routeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFC800',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D4AF37',
    marginBottom: 20,
  },
  routeLineContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 8,
  },
  routeDotA: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFC800',
  },
  routeLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#FFC800',
    marginVertical: 8,
  },
  routeDotB: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFC800',
  },
  inputsContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFC800',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  inputWrapperFocused: {
    borderColor: '#D4AF37',
    backgroundColor: '#FFD700',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    marginLeft: 10,
  },
  priceCard: {
    backgroundColor: '#FFC800',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D4AF37',
    marginBottom: 20,
  },
  priceCardFocused: {
    borderColor: '#D4AF37',
    backgroundColor: '#FFD700',
  },
  routeInfoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(0, 0, 0, 0.55)',
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 4,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginLeft: 8,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFC800',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  priceInput: {
    flex: 1,
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#000000',
  },
  currencySymbol: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginLeft: 8,
  },
  spacer: {
    flex: 1,
  },
  orderButton: {
    height: 60,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 48,
  },
  orderButtonDisabled: {
    opacity: 0.7,
  },
  orderButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  statusContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  statusIndicator: {
    marginBottom: 20,
  },
  statusText: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    marginBottom: 32,
  },
  orderDetailsCard: {
    width: '100%',
    backgroundColor: '#FFC800',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D4AF37',
    marginBottom: 16,
  },
  orderRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderRouteDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFC800',
    marginRight: 12,
  },
  orderRouteDotRed: {
    backgroundColor: '#FFC800',
  },
  orderRouteText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  orderRouteConnector: {
    width: 2,
    height: 20,
    backgroundColor: '#FFC800',
    marginLeft: 5,
    marginVertical: 8,
  },
  orderPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#D4AF37',
  },
  orderPriceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  orderPriceValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#000000',
  },
  driverCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFC800',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  driverAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverAvatarText: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#000000',
  },
  driverInfo: {
    flex: 1,
    marginLeft: 14,
  },
  driverName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  driverLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    marginTop: 2,
  },
  driverActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareTripBtn: {
    backgroundColor: '#FFC800',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  callDriverButton: {
    backgroundColor: '#FFC800',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  callDriverText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  newOrderButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 48,
    width: '100%',
  },
  newOrderButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newOrderButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },

  paymentCard: {
    backgroundColor: '#FFC800',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D4AF37',
    marginBottom: 20,
  },
  paymentCardFocused: {
    borderColor: '#D4AF37',
    backgroundColor: '#FFD700',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  paymentButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#FFC800',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#D4AF37',
    alignItems: 'center',
  },
  paymentButtonSelected: {
    backgroundColor: '#FFD700',
    borderColor: '#D4AF37',
  },
  paymentButtonText: {
    color: '#000000',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
});

