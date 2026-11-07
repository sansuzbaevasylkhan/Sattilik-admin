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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Navigation, Menu, DollarSign, Clock, CheckCircle, Share2 } from 'lucide-react-native';
import { router } from 'expo-router';
import MenuDrawer from '@/components/MenuDrawer';
import { getUser } from '@/store/userStore';
import { useTranslation } from '@/hooks/useTranslation';
import { subscribeMapPick } from '@/store/mapPickStore';
import { getRoute } from '@/lib/routing';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { useTripShare } from '@/hooks/useTripShare';
import RouteMapPreview from '@/components/RouteMapPreview';
import { BG_GRADIENT, BG_DARK, BG_MID, BG_DEEP, GOLD_GRADIENT, GOLD_FOCUSED_BORDER, GOLD_FOCUSED_FILL, GOLD_MEDIUM_FILL, GOLD_MEDIUM_BORDER } from '@/lib/theme';

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

  const buttonScale = useRef(new Animated.Value(1)).current;
  const searchPulse = useRef(new Animated.Value(0.5)).current;

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
        return '#F59E0B';
      case 'accepted':
        return '#22C55E';
      case 'in_progress':
        return '#2563EB';
      case 'completed':
        return '#22C55E';
      default:
        return '#FFFFFF';
    }
  };

  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);
  const liveDriverLocation = useDriverLocation(driver?.phone ?? null);

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
      setRouteInfo(null);
      setRouteCoordinates(null);
      return;
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

        if (!res.ok) throw new Error('Order create failed');

        const orders: Order[] = await res.json();
        if (orders && orders.length > 0) {
          setCurrentOrder(orders[0]);
          setOrderStatus('searching');
        }
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

      <View style={orderStatus === 'form' ? styles.floatingHeader : styles.header}>
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
          style={orderStatus === 'form' ? styles.floatingMenuButton : undefined}
        >
          <Menu size={orderStatus === 'form' ? 22 : 28} color={orderStatus === 'form' ? BG_DARK : '#FFFFFF'} />
        </TouchableOpacity>
        {orderStatus !== 'form' && (
          <>
            <Text style={styles.headerTitle}>{t('order.headerTitleActive')}</Text>
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
                    color={focusedField === 'A' ? '#FFD700' : 'rgba(255,255,255,0.4)'}
                  />
                  <TextInput
                    style={styles.input}
                    value={pointA}
                    onChangeText={(text) => {
                      setPointA(text);
                      setPickupCoords(null);
                    }}
                    placeholder={t('order.pickupPlaceholder')}
                    placeholderTextColor="rgba(255,255,255,0.35)"
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
                    <Navigation size={18} color="#FFD700" />
                  </TouchableOpacity>
                </View>

                <View
                  style={[styles.inputWrapper, focusedField === 'B' && styles.inputWrapperFocused]}
                >
                  <Navigation
                    size={20}
                    color={focusedField === 'B' ? '#FFD700' : 'rgba(255,255,255,0.4)'}
                  />
                  <TextInput
                    style={styles.input}
                    value={pointB}
                    onChangeText={(text) => {
                      setPointB(text);
                      setDropoffCoords(null);
                    }}
                    placeholder={t('order.dropoffPlaceholder')}
                    placeholderTextColor="rgba(255,255,255,0.35)"
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
                    <Navigation size={18} color="#FFD700" />
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
                  color={focusedField === 'price' ? '#FFD700' : 'rgba(255,255,255,0.4)'}
                />
                <Text style={styles.priceLabel}>{t('order.priceLabel')}</Text>
              </View>

              <View style={styles.priceInputRow}>
                <TextInput
                  style={styles.priceInput}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.35)"
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
                  colors={loading ? ['#4B5563', '#374151'] : GOLD_GRADIENT}
                  style={styles.orderButtonGradient}
                >
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.orderButtonText}>{t('order.orderButton')}</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </View>
      )}

      {(orderStatus === 'searching' || orderStatus === 'accepted' || orderStatus === 'in_progress' || orderStatus === 'completed') && (
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
                driver={
                  orderStatus === 'accepted' || orderStatus === 'in_progress' ? liveDriverLocation : null
                }
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

            {driver && (orderStatus === 'accepted' || orderStatus === 'in_progress') && (
              <View style={styles.driverCard}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.driverAvatarText}>{driver.first_name?.[0] || '?'}</Text>
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{abbrev(driver.first_name, driver.last_name)}</Text>
                  <Text style={styles.driverLabel}>{t('order.driverLabel')}</Text>
                </View>
                <View style={styles.driverActions}>
                  <TouchableOpacity
                    style={styles.shareTripBtn}
                    onPress={async () => {
                      if (!currentOrder?.id) return;
                      try {
                        await shareTrip(currentOrder.id);
                      } catch (e) {
                        Alert.alert(t('common.error'), t('order.errorShareFailed'));
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Share2 size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.callDriverButton}
                    onPress={() => {
                      if (!driver.phone) {
                        Alert.alert(t('common.info'), t('order.errorNoDriverPhone'));
                        return;
                      }
                      Linking.openURL(`tel:${driver.phone}`);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.callDriverText}>{t('order.callButton')}</Text>
                  </TouchableOpacity>
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
                    colors={[BG_DARK, BG_DEEP]}
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
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
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
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  routeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    backgroundColor: '#22C55E',
  },
  routeLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 8,
  },
  routeDotB: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  inputsContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputWrapperFocused: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  priceCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  priceCardFocused: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  routeInfoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.45)',
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
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 8,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  priceInput: {
    flex: 1,
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  currencySymbol: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255,255,255,0.5)',
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
    color: BG_DARK,
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    backgroundColor: '#22C55E',
    marginRight: 12,
  },
  orderRouteDotRed: {
    backgroundColor: '#EF4444',
  },
  orderRouteText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  orderRouteConnector: {
    width: 2,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  orderPriceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.5)',
  },
  orderPriceValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFD700',
  },
  driverCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    color: BG_DARK,
  },
  driverInfo: {
    flex: 1,
    marginLeft: 14,
  },
  driverName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  driverLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  driverActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareTripBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  callDriverButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  callDriverText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
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
    color: BG_DARK,
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },

  paymentCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  paymentCardFocused: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255,255,255,0.6)',
  },
  paymentButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  paymentButtonSelected: {
    backgroundColor: 'rgba(255, 215, 0, 0.18)',
    borderColor: 'rgba(255, 215, 0, 0.55)',
  },
  paymentButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
});

