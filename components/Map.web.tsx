import React, { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { QAZALY_CENTER } from '@/lib/maptiler';
import { BG_ALT, BORDER } from '@/lib/theme';

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
  otherPoint?: { lng: number; lat: number } | null;
  otherPointColor?: string;
  driver?: { lng: number; lat: number } | null;
  routeCoordinates?: [number, number][] | null;
}

// MapLibre is a native-only module, so the web build renders a static placeholder.
const CenterPinMap = forwardRef<CenterPinMapHandle, CenterPinMapProps>(
  ({ initialCenter = QAZALY_CENTER, pinColor = '#000000' }, ref) => {
    useImperativeHandle(ref, () => ({
      getCenter: async () => initialCenter,
      easeTo: () => {},
    }));

    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={styles.title}>Карта</Text>
          <Text style={styles.subtitle}>
            Карта мобильді қосымшада көрсетіледі
          </Text>
        </View>

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
  placeholder: {
    flex: 1,
    backgroundColor: BG_ALT,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    paddingTop: 100,
  },
  title: {
    color: '#000000',
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  subtitle: {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    paddingHorizontal: 16,
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
});
