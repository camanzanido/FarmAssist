import { Colors } from '@/src/constants/colors';
import { aboutCopy as copy } from '@/src/constants/copy';
import { contentColumn } from '@/src/constants/layout';
import { InfoSection, infoRowStyles as rows } from '@/src/components/ui/info-section';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Linking, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// CI stamps the tag into the native versionName, so prefer it over app.json's static version.
const APP_VERSION = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '—';

export default function AboutScreen() {
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
        <View style={s.hero}>
          <Image
            source={require('@/assets/images/FarmAssist-logo.png')}
            style={s.logo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <Text style={s.appName}>{copy.appName}</Text>
          <Text style={s.tagline}>{copy.tagline}</Text>
          <View style={s.versionPill}>
            <Text style={s.versionText}>{copy.version(APP_VERSION)}</Text>
          </View>
        </View>

        <InfoSection heading={copy.whatHeading} body={copy.whatBody} />
        <InfoSection heading={copy.rcdaHeading} body={copy.rcdaBody} />
        <InfoSection heading={copy.originHeading} body={copy.originBody} />

        <InfoSection heading={copy.creditsHeading}>
          <View style={rows.group}>
            {copy.credits.map(c => (
              <View key={c.label} style={[rows.row, rows.divider]}>
                <View style={s.iconWrap}>
                  <Ionicons name={c.icon} size={18} color={Colors.ink} />
                </View>
                <Text style={s.rowLabel}>{c.label}</Text>
                <Text style={s.rowValue}>{c.value}</Text>
              </View>
            ))}
          </View>
        </InfoSection>

        <InfoSection heading={copy.contactHeading}>
          <View style={rows.group}>
            <TouchableOpacity style={[rows.row, rows.divider]} onPress={handleContact} activeOpacity={0.7} accessibilityRole="link">
              <View style={s.iconWrap}>
                <Ionicons name="mail-outline" size={18} color={Colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowLabel, { flex: 0 }]}>{copy.contactLabel}</Text>
                <Text style={s.rowSub}>{copy.contactEmail}</Text>
              </View>
              <Ionicons name="open-outline" size={17} color={Colors.inkFaint} />
            </TouchableOpacity>
          </View>
        </InfoSection>

        <Text style={s.footer}>{copy.footer}</Text>
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

  hero: { alignItems: 'center', marginBottom: 26 },
  logo: { width: 96, height: 96, marginBottom: 12 },
  appName: { fontSize: 26, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4 },
  tagline: { fontSize: 14, color: Colors.inkSoft, textAlign: 'center', marginTop: 4, lineHeight: 20 },
  versionPill: { marginTop: 12, backgroundColor: Colors.accentTint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  versionText: { fontSize: 12, fontWeight: '700', color: Colors.accent },

  iconWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.ink },
  rowValue: { fontSize: 14, color: Colors.inkFaint, maxWidth: '50%', textAlign: 'right' },
  rowSub: { fontSize: 13, color: Colors.inkFaint, marginTop: 2 },

  footer: { fontSize: 12.5, color: Colors.inkDim, textAlign: 'center', marginTop: 4 },
});
