import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const s = StyleSheet.create({
  stepLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: '#8A8070', marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C5BFB3' },
  dotActive: { width: 22, backgroundColor: '#0A3B28' },
  dotDone: { backgroundColor: '#5A9A6E' },

});

export default function StepIndicator({ current, total=5 }: { current: number; total: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      <Text style={s.stepLabel}>{`STEP ${current + 1} OF ${total}`}</Text>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[s.dot, i === current && s.dotActive, i < current && s.dotDone]}
        />
      ))}
    </View>
  );
}