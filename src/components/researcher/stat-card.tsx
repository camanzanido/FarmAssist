import { OdometerText } from '@/src/components/ui/odometer-text';
import { CARD_RADIUS, cardShadow, Colors, StatGradients } from '@/src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type StatVariant = keyof typeof StatGradients;

type Props = {
  label: string;
  value: string;
  variant: StatVariant;
  increase?: number;
  increaseLabel?: string;
};

const WHITE = ['#FFFFFF'] as const;
const INK = [Colors.ink] as const;

export function StatCard({ label, value, variant, increase, increaseLabel = 'this month' }: Props) {
  const light = variant === 'soft';
  const rising = increase != null && increase > 0;
  const text = light ? s.textDark : s.textLight;
  const soft = light ? s.softDark : s.softLight;

  return (
    <View
      style={[s.card, { experimental_backgroundImage: StatGradients[variant] }, light && s.cardLight]}
      accessible
      accessibilityLabel={`${label}: ${value}${rising ? `, up ${increase} ${increaseLabel}` : ''}`}
    >
      <View style={s.topRow}>
        <Text style={[s.label, soft]} numberOfLines={2}>{label}</Text>
        {rising && <Ionicons name="trending-up" size={18} color={light ? Colors.accent : '#FFFFFF'} />}
      </View>
      <View style={s.bottomRow}>
        <View style={s.valueWrap}>
          <OdometerText text={value} colors={light ? INK : WHITE} style={s.value} />
        </View>
        {rising && (
          <View style={s.deltaWrap}>
            <Text style={[s.delta, text]}>+{increase!.toLocaleString()}</Text>
            <Text style={[s.deltaCaption, soft]}>{increaseLabel}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { flex: 1, minHeight: 112, borderRadius: CARD_RADIUS, padding: 14, justifyContent: 'space-between', overflow: 'hidden', ...cardShadow },
  cardLight: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  label: { flex: 1, fontSize: 13, fontWeight: '700' },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, marginTop: 14 },
  valueWrap: { flexShrink: 1 },
  value: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.5 },
  deltaWrap: { alignItems: 'flex-end' },
  delta: { fontSize: 13, fontWeight: '800' },
  deltaCaption: { fontSize: 10.5, fontWeight: '600', marginTop: 1 },
  textLight: { color: '#FFFFFF' },
  textDark: { color: Colors.ink },
  softLight: { color: 'rgba(255,255,255,0.86)' },
  softDark: { color: Colors.inkSoft },
});
