import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Layers, Locate, Check } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import CenterPinMap, { CenterPinMapHandle } from '@/components/Map';
import { useMapStyle } from '@/hooks/useMapStyle';
import { reverseGeocode } from '@/lib/geocoding';
import { getRoute } from '@/lib/routing';
import { QAZALY_CENTER } from '@/lib/maptiler';
import { publishMapPick, MapPickField } from '@/store/mapPickStore';
import { BG_DARK, BG_DEEP, GOLD_GRADIENT } from '@/lib/theme';
import { useTranslation } from '@/hooks/useTranslation';

export default function MapPickerScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ field?: string; otherLat?: string; otherLng?: string }>();
  const field: MapPickField = params.field === 'dropoff' ? 'dropoff' : 'pickup';

  const otherPoint =
    params.otherLat && params.otherLng
      ? { lat: parseFloat(params.otherLat), lng: parseFloat(params.otherLng) }
      : null;

  const mapHandleRef = useRef<CenterPinMapHandle>(null);
  const { styleUrl, styleId, cycle } = useMapStyle();

  const [center, setCenter] = useState<[number, number]>(QAZALY_CENTER);
  const [address, setAddress] = useState('');
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolveAddress = (coords: [number, number]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setResolving(true);
      const result = await reverseGeocode(coords[0], coords[1]);
      setAddress(result);
      setResolving(false);
    }, 500);
  };

  const resolveRoute = (coords: [number, number]) => {
    if (!otherPoint) return;
    if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);
    routeDebounceRef.current = setTimeout(async () => {
      const isPickup = field === 'pickup';
      const from = isPickup ? coords : [otherPoint.lng, otherPoint.lat];
      const to = isPickup ? [otherPoint.lng, otherPoint.lat] : coords;
      const route = await getRoute(from[0], from[1], to[0], to[1]);
      setRouteCoordinates(route.coordinates);
    }, 400);
  };

  useEffect(() => {
    resolveAddress(center);
    resolveRoute(center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocateMe = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('mapPicker.locationErrorTitle'), t('mapPicker.locationPermissionDenied'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
      mapHandleRef.current?.easeTo(coords, 16);
    } catch (e) {
      Alert.alert(t('mapPicker.locationErrorTitle'), String(e));
    } finally {
      setLocating(false);
    }
  };

  const handleConfirm = () => {
    publishMapPick({ field, address, lng: center[0], lat: center[1] });
    router.back();
  };

  const styleLabel =
    styleId === 'streets'
      ? t('mapPicker.styleStreets')
      : styleId === 'satellite'
        ? t('mapPicker.styleSatellite')
        : t('mapPicker.styleHybrid');

  return (
    <View style={styles.container}>
      <CenterPinMap
        ref={mapHandleRef}
        mapStyleUrl={styleUrl}
        initialCenter={center}
        onRegionDidChange={(newCenter) => {
          setCenter(newCenter);
          resolveAddress(newCenter);
          resolveRoute(newCenter);
        }}
        pinColor={field === 'pickup' ? '#22C55E' : '#EF4444'}
        otherPoint={otherPoint}
        otherPointColor={field === 'pickup' ? '#EF4444' : '#22C55E'}
        routeCoordinates={routeCoordinates}
      />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.roundButton} onPress={() => router.back()} activeOpacity={0.8}>
          <ChevronLeft size={24} color={BG_DARK} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {field === 'pickup' ? t('mapPicker.titlePickup') : t('mapPicker.titleDropoff')}
        </Text>
        <TouchableOpacity style={styles.roundButton} onPress={cycle} activeOpacity={0.8}>
          <Layers size={20} color={BG_DARK} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.locateButton} onPress={handleLocateMe} activeOpacity={0.8}>
        {locating ? <ActivityIndicator size="small" color={BG_DARK} /> : <Locate size={20} color={BG_DARK} />}
      </TouchableOpacity>

      <View style={styles.bottomSheet}>
        <Text style={styles.styleLabel}>{styleLabel}</Text>
        <View style={styles.addressRow}>
          {resolving ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <Text style={styles.addressText} numberOfLines={2}>
              {address || t('mapPicker.locating')}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} activeOpacity={0.85}>
          <LinearGradient colors={GOLD_GRADIENT} style={styles.confirmGradient}>
            <Check size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.confirmText}>{t('mapPicker.confirmButton')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_DARK },
  topBar: {
    position: 'absolute',
    top: 56,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roundButton: {
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
  title: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    backgroundColor: 'rgba(184, 134, 11, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  locateButton: {
    position: 'absolute',
    right: 20,
    bottom: 190,
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
    backgroundColor: BG_DEEP,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  styleLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  addressRow: {
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: 16,
  },
  addressText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  confirmButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  confirmGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
  },
});
