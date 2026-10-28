import { Colors } from '@/src/constants/colors';
import { termsCopy as copy } from '@/src/constants/copy';
import { contentColumn } from '@/src/constants/layout';
import { InfoSection, infoRowStyles as rows } from '@/src/components/ui/info-section';
import { TERMS_VERSION } from '@/src/utils/terms';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsScreen() {
  const router = useRouter();

  function handleContact() {
    Linking.openURL(`mailto:${copy.contactEmail}`).catch(err => {
      console.warn('Could not open mail app:', err);
    });
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <View style={s.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          accessibilityRole="button"
          accessibilityLabel={copy.back}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.ink} />
        </TouchableOpacity>
        <Text style={s.topTitle} accessibilityRole="header">{copy.title}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.updated}>{copy.updated(TERMS_VERSION)}</Text>
        <Text style={s.intro}>{copy.intro}</Text>

        {copy.sections.map(section => (
          <InfoSection key={section.heading} heading={section.heading} body={section.body} />
        ))}

        <InfoSection heading={copy.contactHeading}>
          <View style={rows.group}>
            <TouchableOpacity style={[rows.row, rows.divider]} onPress={handleContact} activeOpacity={0.7} accessibilityRole="link">
              <Ionicons name="mail-outline" size={18} color={Colors.ink} />
              <Text style={s.rowLabel}>{copy.contactEmail}</Text>
              <Ionicons name="open-outline" size={17} color={Colors.inkFaint} />
            </TouchableOpacity>
          </View>
        </InfoSection>
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
  updated: { fontSize: 12.5, color: Colors.inkFaint, marginBottom: 8 },
  intro: { fontSize: 15, color: Colors.inkMuted, lineHeight: 23, marginBottom: 30 },

  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.ink },
});
