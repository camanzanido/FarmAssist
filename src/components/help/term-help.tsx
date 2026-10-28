import { BottomSheet } from '@/src/components/ui/bottom-sheet';
import { Colors } from '@/src/constants/colors';
import { BUTTON_HEIGHT } from '@/src/constants/layout';
import { GLOSSARY, GlossaryKey, helpCopy } from '@/src/constants/copy';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// A "?" button that explains one or more glossary terms in a bottom sheet.
export function TermHelpButton({ terms, label, size = 20 }: { terms: GlossaryKey[]; label?: string; size?: number }) {
  const [open, setOpen] = useState(false);
  const title = label ?? GLOSSARY[terms[0]].term;

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        hitSlop={10}
        style={s.button}
        accessibilityRole="button"
        accessibilityLabel={helpCopy.termHelpLabel(title)}
      >
        <Ionicons name="help-circle-outline" size={size} color={Colors.accent} />
      </TouchableOpacity>
      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <View style={s.sheet}>
          {terms.map((key, i) => (
            <View key={key} style={[s.entry, i > 0 && s.entryDivided]}>
              <Text style={s.term} accessibilityRole="header">{GLOSSARY[key].term}</Text>
              <Text style={s.definition}>{GLOSSARY[key].definition}</Text>
            </View>
          ))}
          <TouchableOpacity style={s.close} onPress={() => setOpen(false)} accessibilityRole="button">
            <Text style={s.closeText}>{helpCopy.sheetClose}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </>
  );
}

const s = StyleSheet.create({
  button: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  sheet: { paddingBottom: 4 },
  entry: { paddingVertical: 14 },
  entryDivided: { borderTopWidth: 1, borderTopColor: Colors.divider },
  term: { fontSize: 16, fontWeight: '800', color: Colors.ink, marginBottom: 6 },
  definition: { fontSize: 14.5, color: Colors.inkMuted, lineHeight: 21 },
  close: { marginTop: 12, backgroundColor: Colors.ink, borderRadius: 12, height: BUTTON_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 15, fontWeight: '700', color: Colors.onDark },
});
