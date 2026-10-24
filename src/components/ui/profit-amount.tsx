import { Colors } from '@/src/constants/colors';
import { formatCurrency } from '@/src/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

type Props = {
  value: number;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

// The profit gain shown as an up arrow and an amount instead of a plus sign.
export function ProfitAmount({ value, size = 14, color = Colors.accent, style }: Props) {
  const amount = formatCurrency(value);
  return (
    <View style={s.row} accessible accessibilityLabel={`Up ${amount}`}>
      <Ionicons name="arrow-up" size={size} color={color} />
      <Text style={[s.text, { fontSize: size, color }, style]}>{amount}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  text: { fontWeight: '800' },
});
