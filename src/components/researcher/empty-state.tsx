import { Colors } from '@/src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={s.wrap}>
      <Ionicons name={icon} size={36} color={Colors.placeholder} />
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.ink, textAlign: 'center', marginTop: 10 },
  subtitle: { fontSize: 13, color: Colors.inkFaint, textAlign: 'center', marginTop: 4 },
});
