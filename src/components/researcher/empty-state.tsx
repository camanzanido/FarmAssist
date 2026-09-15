import { ResearcherColors as C } from '@/src/constants/colors';
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
      <Ionicons name={icon} size={28} color={C.textFaint} />
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 },
  title: { fontSize: 13.5, fontWeight: '700', color: C.textSoft, textAlign: 'center', marginTop: 10 },
  subtitle: { fontSize: 12.5, color: C.textFaint, textAlign: 'center', marginTop: 4 },
});
