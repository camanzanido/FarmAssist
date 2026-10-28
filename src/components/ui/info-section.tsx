import { Colors } from '@/src/constants/colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// A titled block on reading pages (About, Terms, How to use): text sits on the page, whitespace separates sections.
export function InfoSection({ heading, body, hint, children }: {
  heading: string;
  body?: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <Text style={s.heading} accessibilityRole="header">{heading}</Text>
      {hint && <Text style={s.hint}>{hint}</Text>}
      {body && <Text style={s.body}>{body}</Text>}
      {children}
    </View>
  );
}

// Row lists without a card: a hairline above the group and between rows.
export const infoRowStyles = StyleSheet.create({
  group: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderStrong, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, minHeight: 56 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderStrong },
});

const s = StyleSheet.create({
  section: { marginBottom: 30 },
  heading: { fontSize: 18, fontWeight: '800', color: Colors.ink, letterSpacing: -0.2, marginBottom: 6 },
  hint: { fontSize: 13, color: Colors.inkFaint, marginBottom: 4 },
  body: { fontSize: 15, color: Colors.inkMuted, lineHeight: 23 },
});
