import { useAuth } from '@/src/auth/AuthContext';
import { DECISIONS } from '@/src/constants';
import { GradientText } from '@/src/components/ui/gradient-text';
import { BrandGradient, brandGradientCss, cardShadow, Colors } from '@/src/constants/colors';
import { contentColumn } from '@/src/constants/layout';
import { homeCopy as copy } from '@/src/constants/copy';
import { getDecisionsByUser, type Decision } from '@/src/database/repositories/decisions';
import { useSyncStatus } from '@/src/hooks/use-sync-status';
import { formatCurrency } from '@/src/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { connected } = useSyncStatus();
  const userId = user?.id ?? '';

  const [lastDecision, setLastDecision] = useState<Decision | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setLastDecision(null);
      setLoadError(false);
      return;
    }
    try {
      const rows = await getDecisionsByUser(userId);
      setLastDecision(rows[0] ?? null);
      setLoadError(false);
    } catch (err) {
      console.error('Failed to load last decision:', err);
      setLoadError(true);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const goToDecision = (decisionType: string) => {
    router.push({ pathname: '/input-flow', params: { decisionType } });
  };

  const isOffline = !!user && !connected;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <Text style={s.greeting}>{copy.greeting(user?.name?.trim().split(/\s+/)[0])}</Text>
          {isOffline && (
            <View style={s.offlineIcon} accessible accessibilityRole="image" accessibilityLabel={copy.offlineLabel}>
              <Ionicons name="cloud-offline-outline" size={22} color={Colors.accent} />
            </View>
          )}
        </View>

        <View style={s.topSpacer} />

        <Text style={s.heading}>
          {copy.headingBefore}
          <GradientText text={copy.headingAccent} colors={BrandGradient} />
          {copy.headingAfter}
        </Text>
        <Text style={s.subtitle}>{copy.subtitle}</Text>

        {loadError && (
          <View style={s.loadErrorBanner}>
            <Ionicons name="warning-outline" size={16} color={Colors.danger} />
            <Text style={s.loadErrorText}>{copy.loadErrorTitle}</Text>
            <TouchableOpacity onPress={load} hitSlop={8}>
              <Text style={s.loadErrorRetry}>{copy.retry}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.decisionList}>
          {DECISIONS.map(d => (
            <Pressable
              key={d.id}
              style={({ pressed }) => [s.decisionRow, pressed && s.decisionRowPressed]}
              onPress={() => goToDecision(d.id)}
              accessibilityRole="button"
              accessibilityLabel={d.label}
              accessibilityHint={d.description}
            >
              {({ pressed }) => (
                <>
                  <View style={[s.decisionIconWrap, pressed && s.decisionIconWrapPressed]}>
                    <Ionicons name={d.icon} size={25} color={pressed ? Colors.onDark : Colors.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.decisionLabel, pressed && s.textOnGradient]}>{d.label}</Text>
                    <Text style={[s.decisionDesc, pressed && s.descOnGradient]} numberOfLines={1}>{d.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={pressed ? Colors.onDark : Colors.ink} style={{ opacity: pressed ? 0.8 : 0.3 }} />
                </>
              )}
            </Pressable>
          ))}
        </View>

        {lastDecision && (
          <View style={s.lastDecisionBlock}>
            <Text style={s.lastDecisionHeading}>{copy.lastDecisionHeading}</Text>
            <View style={s.lastDecisionCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.lastDecisionResult} numberOfLines={1}>{lastDecision.result}</Text>
                <Text style={s.lastDecisionMeta}>{formatDate(lastDecision.datetime)} · saved on this phone</Text>
              </View>
              <Text style={s.lastDecisionProfit}>+{formatCurrency(lastDecision.profit_increase)}</Text>
            </View>
          </View>
        )}

        <View style={s.bottomSpacer} />

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  content: { ...contentColumn, flexGrow: 1, padding: 22, paddingTop: 32, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  // On tall screens the free space splits 1:2 above/below, so the content sits a little above centre instead of hugging the top.
  topSpacer: { flexGrow: 1 },
  bottomSpacer: { flexGrow: 2 },
  greeting: { fontSize: 20, fontWeight: '700', color: Colors.ink },
  offlineIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.accentTint, alignItems: 'center', justifyContent: 'center' },

  heading: { fontSize: 32, fontWeight: '800', color: Colors.ink, lineHeight: 38, letterSpacing: -0.6, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.accent, marginBottom: 24 },

  loadErrorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.dangerBg, borderWidth: 1, borderColor: Colors.dangerBorder, borderRadius: 12, padding: 12, marginBottom: 18 },
  loadErrorText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: Colors.dangerText },
  loadErrorRetry: { fontSize: 12.5, fontWeight: '700', color: Colors.ink },

  decisionList: { gap: 11, marginBottom: 24 },
  decisionRow: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, ...cardShadow },
  decisionRowPressed: { experimental_backgroundImage: brandGradientCss(135), borderColor: 'transparent' },
  decisionIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  decisionIconWrapPressed: { backgroundColor: 'rgba(255,255,255,0.18)' },
  decisionLabel: { fontSize: 16, fontWeight: '800', color: Colors.ink },
  decisionDesc: { fontSize: 13, color: Colors.inkSoft, marginTop: 2 },
  textOnGradient: { color: Colors.onDark },
  descOnGradient: { color: 'rgba(255,255,255,0.85)' },

  lastDecisionBlock: { borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: 18 },
  lastDecisionHeading: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: Colors.accent, marginBottom: 11 },
  lastDecisionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.accentTint, borderRadius: 14, padding: 14, ...cardShadow },
  lastDecisionResult: { fontSize: 15, fontWeight: '700', color: Colors.ink },
  lastDecisionMeta: { fontSize: 13, color: Colors.inkSoft, marginTop: 2 },
  lastDecisionProfit: { fontSize: 15, fontWeight: '800', color: Colors.accent },
});
