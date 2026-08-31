import { Colors } from '@/src/constants/colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const s = StyleSheet.create({
  wrap: { flex: 1 },
  track: { flexDirection: 'row', gap: 5, marginBottom: 6 },
  segment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: Colors.borderStrong },
  segmentDone: { backgroundColor: Colors.accentSoft },
  segmentActive: { backgroundColor: Colors.ink },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: Colors.inkFaint },
});

export default function StepIndicator({
  current,
  total = 5,
  context,
}: {
  current: number;
  total: number;
  context?: string;
}) {
  return (
    <View style={s.wrap}>
      <View style={s.track}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[s.segment, i < current && s.segmentDone, i === current && s.segmentActive]}
          />
        ))}
      </View>
      <Text style={s.label}>
        {`STEP ${current + 1} OF ${total}`}
        {context ? ` · ${context.toUpperCase()}` : ''}
      </Text>
    </View>
  );
}
