import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';

type Props = {
  value: number;
  onChange: (next: number) => void;
  max?: number;
  size?: number;
  interactive?: boolean;
};

export default function StarRating({
  value,
  onChange,
  max = 5,
  size = 22,
  interactive = true,
}: Props) {
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <View style={styles.row}>
      {stars.map((s) => {
        const filled = s <= value;
        const color = filled ? '#EAB308' : 'rgba(255,255,255,0.25)';
        const fill = filled ? '#F59E0B' : 'rgba(255,255,255,0)';

        return (
          <TouchableOpacity
            key={s}
            activeOpacity={0.7}
            disabled={!interactive}
            onPress={() => onChange(s)}
          >
            <Star size={size} color={color} fill={fill} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
});

