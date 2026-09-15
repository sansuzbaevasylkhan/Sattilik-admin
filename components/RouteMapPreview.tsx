import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Map as MapLibreMap,
  Camera,
  Marker,
  GeoJSONSource,
  Layer,
  CameraRef,
} from '@maplibre/maplibre-react-native';
import { Car } from 'lucide-react-native';
import { MAP_STYLES, QAZALY_CENTER } from '@/lib/maptiler';
import { ROUTE_LINE_COLOR } from '@/lib/theme';

interface RouteMapPreviewProps {
  pickup?: { lng: number; lat: number } | null;
  dropoff?: { lng: number; lat: number } | null;
  driver?: { lng: number; lat: number } | null;
  /** OSRM/getRoute() арқылы алынған нақты жол сызығы, [lng, lat][] түрінде. */
  routeCoordinates?: [number, number][] | null;
  height?: number;
  /** true болса — карта контейнерінің толық фонын алады (борамка/margin жоқ). */
  fill?: boolean;
}

/** Тек көрсету үшін (интерактивті емес) кіші карта — сапар мәртебесі экрандарында. */
export default function RouteMapPreview({
  pickup,
  dropoff,
  driver,
  routeCoordinates,
  height = 220,
  fill = false,
}: RouteMapPreviewProps) {
  const cameraRef = useRef<CameraRef>(null);

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

  useEffect(() => {
    fitToRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup?.lng, pickup?.lat, dropoff?.lng, dropoff?.lat, routeCoordinates]);

  useEffect(() => {
    if (driver) {
      cameraRef.current?.easeTo({ center: [driver.lng, driver.lat], duration: 500 });
    }
  }, [driver]);

  return (
    <View style={fill ? styles.containerFill : [styles.container, { height }]}>
      <MapLibreMap style={styles.map} mapStyle={MAP_STYLES.streets} logo={false} attribution={false} compass={false}>
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
              paint={{ 'line-color': '#FFFFFF', 'line-width': 7, 'line-opacity': 0.9 }}
            />
            <Layer
              id="routeLine"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': ROUTE_LINE_COLOR, 'line-width': 4 }}
            />
          </GeoJSONSource>
        )}

        {pickup && (
          <Marker lngLat={[pickup.lng, pickup.lat]} anchor="bottom">
            <View style={styles.pinOuter}>
              <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
            </View>
          </Marker>
        )}

        {dropoff && (
          <Marker lngLat={[dropoff.lng, dropoff.lat]} anchor="bottom">
            <View style={styles.pinOuter}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            </View>
          </Marker>
        )}

        {driver && (
          <Marker lngLat={[driver.lng, driver.lat]} anchor="center">
            <View style={styles.driverMarker}>
              <Car size={16} color="#0A1628" />
            </View>
          </Marker>
        )}
      </MapLibreMap>
    </View>
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
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    flex: 1,
  },
  pinOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  driverMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
