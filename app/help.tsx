import { cardSurface, Colors } from '@/src/constants/colors';
import { GLOSSARY, GlossaryKey, helpCopy as copy } from '@/src/constants/copy';
import { contentColumn } from '@/src/constants/layout';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TERM_ORDER = Object.keys(GLOSSARY) as GlossaryKey[];

function TermRow({ termKey, last }: { termKey: GlossaryKey; last: boolean }) {
  const [open, setOpen] = useState(false);
  const { term, definition } = GLOSSARY[termKey];
  return (
    <View style={!last && s.rowBorder}>
      <TouchableOpacity
        style={s.termRow}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={s.termLabel}>{term}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.inkFaint} />
      </TouchableOpacity>
      {open && <Text style={s.termBody}>{definition}</Text>}
    </View>
  );
}

export default function HelpScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel={copy.back}>
          <Ionicons name="arrow-back" size={22} color={Colors.ink} />
        </TouchableOpacity>
        <Text style={s.topTitle} accessibilityRole="header">{copy.title}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>{copy.intro}</Text>

        <Text style={s.sectionHeading}>{copy.stepsHeading}</Text>
        <View style={s.card}>
          {copy.steps.map((step, i) => (
            <View key={step.title} style={[s.step, i < copy.steps.length - 1 && s.rowBorder]}>
              <View style={s.stepBadge}>
                <Text style={s.stepNumber}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.stepTitleRow}>
                  <Ionicons name={step.icon} size={18} color={Colors.accent} />
                  <Text style={s.stepTitle}>{step.title}</Text>
                </View>
                <Text style={s.stepBody}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={s.sectionHeading}>{copy.termsHeading}</Text>
        <Text style={s.hint}>{copy.termsHint}</Text>
        <View style={s.card}>
          {TERM_ORDER.map((key, i) => (
            <TermRow key={key} termKey={key} last={i === TERM_ORDER.length - 1} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  topBar: { ...contentColumn, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 17, fontWeight: '800', color: Colors.ink },

  content: { ...contentColumn, padding: 22, paddingTop: 8, paddingBottom: 40 },
  intro: { fontSize: 15, color: Colors.inkMuted, lineHeight: 22, marginBottom: 22 },

  sectionHeading: { fontSize: 12, fontWeight: '700', letterSpacing: 0.9, color: Colors.inkFaint, marginBottom: 10 },
  hint: { fontSize: 13, color: Colors.inkFaint, marginTop: -4, marginBottom: 10 },
  card: { ...cardSurface, marginBottom: 24 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },

  step: { flexDirection: 'row', gap: 14, padding: 16 },
  stepBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  stepNumber: { fontSize: 14, fontWeight: '800', color: Colors.accent },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  stepTitle: { fontSize: 15, fontWeight: '800', color: Colors.ink },
  stepBody: { fontSize: 14, color: Colors.inkMuted, lineHeight: 20 },

  termRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 52 },
  termLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.ink },
  termBody: { fontSize: 14, color: Colors.inkMuted, lineHeight: 20, paddingHorizontal: 16, paddingBottom: 14, marginTop: -4 },
});
