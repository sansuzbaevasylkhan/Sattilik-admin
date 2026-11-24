/* eslint-disable react-hooks/immutability -- Gesture worklets update Reanimated shared values on the UI thread. */
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';

interface SwipeToAcceptProps {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onAccept: () => void;
}

export function SwipeToAccept({ label, loading = false, disabled = false, onAccept }: SwipeToAcceptProps) {
  const [width, setWidth] = useState(0);
  const translationX = useSharedValue(0);
  const startX = useSharedValue(0);
  const accepted = useSharedValue(false);
  const knobSize = 52;

  const gesture = useMemo(
    () => Gesture.Pan()
      .enabled(!disabled && !loading && width > 0)
      .activeOffsetX(8)
      .failOffsetY([-14, 14])
      .onStart(() => {
        startX.value = translationX.value;
        accepted.value = false;
      })
      .onUpdate((event) => {
        translationX.value = Math.max(0, Math.min(width - knobSize, startX.value + event.translationX));
      })
      .onEnd(() => {
        if (translationX.value >= width - knobSize - 8 && !accepted.value) {
          accepted.value = true;
          translationX.value = withSpring(width - knobSize, { damping: 22, stiffness: 240 });
          runOnJS(onAccept)();
        } else {
          translationX.value = withSpring(0, { damping: 22, stiffness: 240 });
        }
      }),
    [accepted, disabled, loading, onAccept, startX, translationX, width],
  );

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translationX.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: translationX.value + knobSize }));
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout} style={[styles.track, (disabled || loading) && styles.disabled]}>
      <Reanimated.View pointerEvents="none" style={[styles.fill, fillStyle]} />
      {loading ? (
        <ActivityIndicator color="#111111" />
      ) : (
        <Text pointerEvents="none" style={styles.label}>{label}</Text>
      )}
      <GestureDetector gesture={gesture}>
        <Reanimated.View style={[styles.knob, knobStyle]}>
          <ChevronRight size={24} color="#111111" strokeWidth={2.8} />
        </Reanimated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 56,
    borderRadius: 18,
    backgroundColor: '#2B2B2B',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFill,
    right: undefined,
    backgroundColor: '#FFD700',
    borderRadius: 18,
  },
  disabled: { opacity: 0.65 },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.4,
  },
  knob: {
    position: 'absolute',
    left: 2,
    top: 2,
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
  },
});
