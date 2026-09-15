import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Map as MapLibreMap,
  Camera,
  UserLocation,
  Marker,
  GeoJSONSource,
  Layer,
  MapRef,
  CameraRef,
} from '@maplibre/maplibre-react-native';
import { MapPin, Car } from 'lucide-react-native';
import { QAZALY_CENTER, QAZALY_DEFAULT_ZOOM } from '@/lib/maptiler';
import { ROUTE_LINE_COLOR } from '@/lib/theme';

export interface CenterPinMapHandle {
  getCenter: () => Promise<[number, number] | null>;
  easeTo: (center: [number, number], zoom?: number) => void;
}

interface CenterPinMapProps {
  mapStyleUrl: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  showUserLocation?: boolean;
  onRegionDidChange?: (center: [number, number]) => void;
  pinColor?: string;
  /** Екінші нүкте (мыс. pickup таңдап жатқанда, бұрын таңдалған dropoff). */
  otherPoint?: { lng: number; lat: number } | null;
  otherPointColor?: string;
  /** Жүргізушінің орны. */
  driver?: { lng: number; lat: number } | null;
  /** OSRM/getRoute() арқылы алынған нақты жол сызығы, [lng, lat][] түрінде. */
  routeCoordinates?: [number, number][] | null;
}

/**
 * inDrive/Яндекс стиліндегі «орталықтағы пин» карта: пин экранда қозғалмайды,
 * пайдаланушы картаны жылжытады — пин астындағы нүкте таңдалған орын болады.
 */
const CenterPinMap = forwardRef<CenterPinMapHandle, CenterPinMapProps>(
  (
    {
      mapStyleUrl,
      initialCenter = QAZALY_CENTER,
      initialZoom = QAZALY_DEFAULT_ZOOM,
      showUserLocation = true,
      onRegionDidChange,
      pinColor = '#FFD700',
      otherPoint = null,
      otherPointColor = '#EF4444',
      driver = null,
      routeCoordinates = null,
    },
    ref,
  ) => {
    const mapRef = useRef<MapRef>(null);
    const cameraRef = useRef<CameraRef>(null);

    useImperativeHandle(ref, () => ({
      getCenter: async () => {
        try {
          const center = await mapRef.current?.getCenter();
          return center ? [center[0], center[1]] : null;
        } catch {
          return null;
        }
      },
      easeTo: (center, zoom) => {
        cameraRef.current?.easeTo({ center, zoom, duration: 400 });
      },
    }));

    return (
      <View style={styles.container}>
        <MapLibreMap
          ref={mapRef}
          style={styles.map}
          mapStyle={mapStyleUrl}
          logo={false}
          attribution={false}
          compass={false}
          onRegionDidChange={(e) => {
            const center = e?.nativeEvent?.center;
            if (center && onRegionDidChange) {
              onRegionDidChange([center[0], center[1]]);
            }
          }}
        >
          <Camera
            ref={cameraRef}
            initialViewState={{ center: initialCenter, zoom: initialZoom }}
          />
          {showUserLocation && <UserLocation animated />}

          {driver && (
            <Marker lngLat={[driver.lng, driver.lat]} anchor="center">
              <View style={styles.driverMarker}>
                <Car size={16} color="#0A1628" />
              </View>
            </Marker>
          )}

          {routeCoordinates && routeCoordinates.length > 1 && (
            <GeoJSONSource
              id="pickerRouteSource"
              data={{
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: routeCoordinates },
              }}
            >
              <Layer
                id="pickerRouteLineCasing"
                type="line"
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                paint={{ 'line-color': '#FFFFFF', 'line-width': 7, 'line-opacity': 0.9 }}
              />
              <Layer
                id="pickerRouteLine"
                type="line"
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                paint={{ 'line-color': ROUTE_LINE_COLOR, 'line-width': 4 }}
              />
            </GeoJSONSource>
          )}

          {otherPoint && (
            <Marker lngLat={[otherPoint.lng, otherPoint.lat]} anchor="bottom">
              <View style={styles.otherPinOuter}>
                <View style={[styles.otherPinDot, { backgroundColor: otherPointColor }]} />
              </View>
            </Marker>
          )}
        </MapLibreMap>

        <View style={styles.pinWrap} pointerEvents="none">
          <MapPin size={40} color={pinColor} fill={pinColor} />
          <View style={[styles.pinShadow, { backgroundColor: pinColor }]} />
        </View>
      </View>
    );
  },
);

CenterPinMap.displayName = 'CenterPinMap';

export default CenterPinMap;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  pinWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
    alignItems: 'center',
  },
  pinShadow: {
    width: 8,
    height: 4,
    borderRadius: 4,
    opacity: 0.3,
    marginTop: -4,
  },
  otherPinOuter: {
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
  otherPinDot: {
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
