import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View, TouchableOpacity } from 'react-native';
import {
  Map as MapLibreMap,
  Camera,
  Marker,
  GeoJSONSource,
  Layer,
  CameraRef,
} from '@maplibre/maplibre-react-native';
import { Layers, LocateFixed, Minus, Plus } from 'lucide-react-native';
import { MAP_STYLES, QAZALY_CENTER, MapStyleId } from '@/lib/maptiler';
import { ROUTE_LINE_COLOR } from '@/lib/theme';

interface RouteMapPreviewProps {
  pickup?: { lng: number; lat: number } | null;
  dropoff?: { lng: number; lat: number } | null;
  driver?: { lng: number; lat: number; bearing?: number } | null;
  /** OSRM/getRoute() арқылы алынған нақты жол сызығы, [lng, lat][] түрінде. */
  routeCoordinates?: [number, number][] | null;
  height?: number;
  /** true болса — карта контейнерінің толық фонын алады (борамка/margin жоқ). */
  fill?: boolean;
  /** Автокамераны жүргізушінің артынан жылжытады. */
  followDriver?: boolean;
  /** Нүктелер өзгерген сайын камераны маршрутқа автоматты fit етеді. */
  fitRoute?: boolean;
  /** Driver icon size in layout pixels; defaults to 64. */
  taxiIconSize?: number;
}

/** Тек көрсету үшін (интерактивті емес) кіші карта — сапар мәртебесі экрандарында. */
export default function RouteMapPreview({
  pickup,
  dropoff,
  driver,
  routeCoordinates,
  height = 220,
  fill = false,
  followDriver = true,
  fitRoute = true,
  taxiIconSize = 64,
}: RouteMapPreviewProps) {
  const cameraRef = useRef<CameraRef>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleId>('hybrid');
  const [zoom, setZoom] = useState(13);
  const centeredOnDriver = useRef(false);
  const driverLat = driver?.lat ?? null;
  const driverLng = driver?.lng ?? null;

  const center = driver ?? pickup ?? dropoff ?? { lng: QAZALY_CENTER[0], lat: QAZALY_CENTER[1] };

  const fitToRoute = () => {
    const points: [number, number][] = [];
    if (routeCoordinates && routeCoordinates.length > 0) {
      points.push(...routeCoordinates);
    } else {
      if (pickup) points.push([pickup.lng, pickup.lat]);
      if (dropoff) points.push([dropoff.lng, dropoff.lat]);
    }
    if (points.length < 2) return;

    let west = points[0][0];
    let east = points[0][0];
    let south = points[0][1];
    let north = points[0][1];
    for (const [lng, lat] of points) {
      if (lng < west) west = lng;
      if (lng > east) east = lng;
      if (lat < south) south = lat;
      if (lat > north) north = lat;
    }

    cameraRef.current?.fitBounds([west, south, east, north], {
      padding: { top: 40, bottom: 40, left: 40, right: 40 },
      duration: 500,
    });
  };

  const changeZoom = (delta: number) => {
    const nextZoom = Math.max(4, Math.min(19, zoom + delta));
    setZoom(nextZoom);
    cameraRef.current?.zoomTo(nextZoom, { duration: 250 });
  };

  useEffect(() => {
    if (fitRoute) fitToRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRoute, pickup?.lng, pickup?.lat, dropoff?.lng, dropoff?.lat, routeCoordinates]);

  useEffect(() => {
    if (driverLat !== null && driverLng !== null && (followDriver || !centeredOnDriver.current)) {
      cameraRef.current?.easeTo({ center: [driverLng, driverLat], zoom, duration: 500 });
      centeredOnDriver.current = true;
    }
  }, [driverLat, driverLng, followDriver, zoom]);

  return (
    <View style={fill ? styles.containerFill : [styles.container, { height }]}>
      <MapLibreMap
        style={styles.map}
        mapStyle={MAP_STYLES[mapStyle]}
        logo={false}
        attribution={false}
        compass={false}
      >
        <Camera ref={cameraRef} initialViewState={{ center: [center.lng, center.lat], zoom: 13 }} />

        {routeCoordinates && routeCoordinates.length > 1 && (
          <GeoJSONSource
            id="routeSource"
            data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: routeCoordinates },
            }}
          >
            <Layer
              id="routeLineCasing"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': '#000000', 'line-width': 8, 'line-opacity': 1 }}
            />
            <Layer
              id="routeLine"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': ROUTE_LINE_COLOR, 'line-width': 5 }}
            />
          </GeoJSONSource>
        )}

        {pickup && (
          <Marker lngLat={[pickup.lng, pickup.lat]} anchor="bottom">
            <View style={styles.pinOuter}>
              <View style={[styles.dot, { backgroundColor: '#FFC800' }]} />
            </View>
          </Marker>
        )}

        {dropoff && (
          <Marker lngLat={[dropoff.lng, dropoff.lat]} anchor="bottom">
            <View style={styles.pinOuter}>
              <View style={[styles.dot, { backgroundColor: '#FFC800' }]} />
            </View>
          </Marker>
        )}

        {driver && (
          <SmoothTaxiMarker driver={driver} size={taxiIconSize} />
        )}
      </MapLibreMap>

      <View pointerEvents="box-none" style={styles.controls}>
        <TouchableOpacity
          accessibilityLabel="Map layers"
          style={styles.controlButton}
          onPress={() => setMapStyle((current) => current === 'hybrid' ? 'streets' : 'hybrid')}
        >
          <Layers size={19} color="#FFD700" />
        </TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Zoom in" style={styles.controlButton} onPress={() => changeZoom(1)}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Zoom out" style={styles.controlButton} onPress={() => changeZoom(-1)}>
          <Minus size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="Center on driver"
          style={styles.controlButton}
          onPress={() => {
            const point = driver ?? pickup ?? dropoff;
            if (point) cameraRef.current?.easeTo({ center: [point.lng, point.lat], zoom, duration: 350 });
          }}
        >
          <LocateFixed size={19} color="#FFD700" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface SmoothTaxiMarkerProps {
  driver: { lng: number; lat: number; bearing?: number };
  size: number;
}

function SmoothTaxiMarker({ driver, size }: SmoothTaxiMarkerProps) {
  const [coordinate, setCoordinate] = useState({ lng: driver.lng, lat: driver.lat });
  const coordinateRef = useRef(coordinate);
  const [animatedBearing] = useState(() => new Animated.Value(driver.bearing ?? 0));

  useEffect(() => {
    const from = coordinateRef.current;
    const to = { lng: driver.lng, lat: driver.lat };
    const startedAt = Date.now();
    const duration = 1100;
    let frame = 0;

    const animate = () => {
      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      const eased = progress * (2 - progress);
      const next = {
        lng: from.lng + (to.lng - from.lng) * eased,
        lat: from.lat + (to.lat - from.lat) * eased,
      };
      coordinateRef.current = next;
      setCoordinate(next);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [driver.lat, driver.lng]);

  useEffect(() => {
    const desired = ((driver.bearing ?? 0) % 360 + 360) % 360;
    animatedBearing.stopAnimation((current) => {
      const delta = ((desired - (current % 360) + 540) % 360) - 180;
      const nextTarget = current + delta;
      Animated.timing(animatedBearing, {
          toValue: nextTarget,
          duration: 420,
          useNativeDriver: true,
        }).start();
    });
  }, [animatedBearing, driver.bearing]);

  const rotation = animatedBearing.interpolate({
    inputRange: [-1080, 0, 1080],
    outputRange: ['-1080deg', '0deg', '1080deg'],
    extrapolate: 'extend',
  });

  return (
    <Marker lngLat={[coordinate.lng, coordinate.lat]} anchor="center">
      <Animated.View
        pointerEvents="none"
        style={{
          width: size,
          height: size * 1.42,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: rotation }],
        }}
      >
        <Image
          source={require('../assets/icons/taxi-map-icon.png')}
          resizeMode="contain"
          style={{ width: size, height: size * 1.42 }}
        />
      </Animated.View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
    marginBottom: 16,
  },
  containerFill: {
    ...StyleSheet.absoluteFill,
  },
  map: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    top: 108,
    right: 14,
    gap: 9,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18,18,18,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.32)',
  },
  styleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFD700',
    backdropFilter: 'blur(10px)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  styleText: {
    color: '#000000',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  pinOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFC800',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.18)',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
});
