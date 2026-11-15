import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Map as MapIcon } from 'lucide-react-native';
import { BG_ALT, BORDER } from '@/lib/theme';

interface RouteMapPreviewProps {
  pickup?: { lng: number; lat: number } | null;
  dropoff?: { lng: number; lat: number } | null;
  driver?: { lng: number; lat: number; bearing?: number } | null;
  routeCoordinates?: [number, number][] | null;
  height?: number;
  fill?: boolean;
}

// MapLibre is a native-only module, so the web build renders a static placeholder.
export default function RouteMapPreview({
  pickup,
  dropoff,
  driver,
  height = 220,
  fill = false,
}: RouteMapPreviewProps) {
  const hasPoints = Boolean(pickup || dropoff || driver);

  return (
    <View
      style={[
        fill ? styles.containerFill : [styles.container, { height }],
        styles.inner,
      ]}
    >
      <MapIcon size={32} color="#000000" />
      <Text style={styles.title}>Карта</Text>
      <Text style={styles.subtitle}>
        {hasPoints
          ? 'Маршрут мобильді қосымшада көрсетіледі'
          : 'Орналасу күтілуде'}
      </Text>
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
    ...StyleSheet.absoluteFill,
  },
  inner: {
    backgroundColor: BG_ALT,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
});
