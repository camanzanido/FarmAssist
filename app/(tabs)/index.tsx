import { useAuth } from '@/src/auth/AuthContext';
import { DECISIONS, type DecisionType } from '@/src/constants';
import { AnimatedIcon, MotionIcon, useIconMotion, type IconMotion } from '@/src/components/ui/animated-icon';
import { usePressScale } from '@/src/components/ui/pressable-scale';
import { GradientText } from '@/src/components/ui/gradient-text';
import { BrandGradient, brandGradientCss, CARD_PADDING, CARD_RADIUS, cardShadow, Colors } from '@/src/constants/colors';
import { contentColumn } from '@/src/constants/layout';
import { decisionResultLabel, helpCopy, homeCopy as copy } from '@/src/constants/copy';
import { getDecisionsByUser, type Decision } from '@/src/database/repositories/decisions';
import { useSyncStatus } from '@/src/hooks/use-sync-status';
import { useUpdateCheck } from '@/src/hooks/use-update-check';
import { ProfitAmount } from '@/src/components/ui/profit-amount';
import { useNavLock } from '@/src/hooks/use-nav-lock';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Each decision icon reacts in a way that suits its glyph.
const DECISION_MOTION: Record<DecisionType, IconMotion> = {
  crop_choice: 'wiggle',
  crop_variety: 'flip',
  protect: 'pop',
};

function DecisionCard({ decision: d, onPress }: { decision: (typeof DECISIONS)[number]; onPress: (id: string) => void }) {
  const press = usePressScale();
  const iconMotion = useIconMotion(DECISION_MOTION[d.id]);
  const handlePressIn = () => {
    iconMotion.play();
    press.onPressIn();
  };
  return (
    <Animated.View style={press.scaleStyle}>
      <Pressable
        style={({ pressed }) => [s.decisionRow, pressed && s.decisionRowPressed]}
        onPress={() => onPress(d.id)}
        onPressIn={handlePressIn}
        onPressOut={press.onPressOut}
        accessibilityRole="button"
        accessibilityLabel={d.label}
        accessibilityHint={d.description}
      >
        {({ pressed }) => (
          <>
            <View style={s.decisionIconWrap}>
              <MotionIcon name={d.icon} size={25} color={pressed ? Colors.onDark : Colors.ink} style={iconMotion.style} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.decisionLabel, pressed && s.textOnGradient]}>{d.label}</Text>
              <Text style={[s.decisionDesc, pressed && s.descOnGradient]} numberOfLines={1}>{d.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={pressed ? Colors.onDark : Colors.ink} style={{ opacity: pressed ? 0.8 : 0.3 }} />
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const nav = useNavLock();
  const { user } = useAuth();
  const { connected } = useSyncStatus();
  const { update, dismiss } = useUpdateCheck();
  const userId = user?.id ?? '';

  const [lastDecision, setLastDecision] = useState<Decision | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [visits, setVisits] = useState(0);
  const helpMotion = useIconMotion('wiggle');

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

  useFocusEffect(useCallback(() => { load(); setVisits(n => n + 1); }, [load]));

  const goToDecision = (decisionType: string) => {
    nav.push({ pathname: '/input-flow', params: { decisionType } });
  };

  const isOffline = !!user && !connected;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <Image
            source={require('@/assets/images/FarmAssist-logo.png')}
            style={s.logo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            accessibilityLabel="FarmAssist"
          />
          <View style={s.headerIcons}>
            {isOffline && (
              <View style={s.offlineIcon} accessible accessibilityRole="image" accessibilityLabel={copy.offlineLabel}>
                <AnimatedIcon name="cloud-offline-outline" size={23} color={Colors.ink} motion="pop" trigger={visits} />
              </View>
            )}
            <TouchableOpacity
              style={s.helpIcon}
              onPressIn={helpMotion.play}
              onPress={() => nav.push('/help')}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={helpCopy.helpLabel}
            >
              <MotionIcon name="help-circle-outline" size={24} color={Colors.ink} style={helpMotion.style} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.topSpacer} />

        <Text style={s.greeting}>{copy.greeting(user?.name?.trim().split(/\s+/)[0])}</Text>
        <Text style={s.heading}>
          {copy.headingBefore}
          <GradientText text={copy.headingAccent} colors={BrandGradient} />
          {copy.headingAfter}
        </Text>
        <Text style={s.subtitle}>{copy.subtitle}</Text>

        {update && (
          <View style={s.updateBanner}>
            <Ionicons name="arrow-up-circle-outline" size={18} color={Colors.accent} />
            <Text style={s.updateText}>{copy.updateTitle(update.version)}</Text>
            <TouchableOpacity onPress={() => Linking.openURL(update.url).catch(() => {})} hitSlop={8} accessibilityRole="link">
              <Text style={s.updateLink}>{copy.updateDownload}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={dismiss} hitSlop={8} accessibilityRole="button" accessibilityLabel={copy.updateDismiss}>
              <Ionicons name="close" size={18} color={Colors.inkFaint} />
            </TouchableOpacity>
          </View>
        )}

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
            <DecisionCard key={d.id} decision={d} onPress={goToDecision} />
          ))}
        </View>

        {lastDecision && (
          <View style={s.lastDecisionBlock}>
            <Text style={s.lastDecisionHeading}>{copy.lastDecisionHeading}</Text>
            <View style={s.lastDecisionCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.lastDecisionResult} numberOfLines={1}>{decisionResultLabel(lastDecision.result)}</Text>
                <Text style={s.lastDecisionMeta}>{formatDate(lastDecision.datetime)} · saved on this phone</Text>
              </View>
              {lastDecision.result !== '' && <ProfitAmount value={lastDecision.profit_increase} size={15} />}
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

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  logo: { width: 34, height: 34 },
  // On tall screens the free space splits 1:2 above/below, so the content sits a little above centre instead of hugging the top.
  topSpacer: { flexGrow: 1 },
  bottomSpacer: { flexGrow: 2 },
  greeting: { fontSize: 20, fontWeight: '700', color: Colors.ink, marginBottom: 6 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  helpIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  offlineIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },

  heading: { fontSize: 32, fontWeight: '800', color: Colors.ink, lineHeight: 38, letterSpacing: -0.6, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.ink, marginBottom: 24 },

  updateBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.accentTint, borderWidth: 1, borderColor: Colors.accentTintStrong, borderRadius: 12, padding: 12, marginBottom: 18 },
  updateText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.ink },
  updateLink: { fontSize: 14, fontWeight: '700', color: Colors.accent },
  loadErrorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.dangerBg, borderWidth: 1, borderColor: Colors.dangerBorder, borderRadius: 12, padding: 12, marginBottom: 18 },
  loadErrorText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: Colors.dangerText },
  loadErrorRetry: { fontSize: 12.5, fontWeight: '700', color: Colors.ink },

  decisionList: { gap: 11, marginBottom: 24 },
  decisionRow: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, ...cardShadow },
  decisionRowPressed: { experimental_backgroundImage: brandGradientCss(135), borderColor: 'transparent' },
  decisionIconWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  decisionLabel: { fontSize: 16, fontWeight: '800', color: Colors.ink },
  decisionDesc: { fontSize: 13, color: Colors.inkSoft, marginTop: 2 },
  textOnGradient: { color: Colors.onDark },
  descOnGradient: { color: 'rgba(255,255,255,0.85)' },

  lastDecisionBlock: { borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: 18 },
  lastDecisionHeading: { fontSize: 14, fontWeight: '700', color: Colors.accent, marginBottom: 11 },
  lastDecisionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.accentTint, borderRadius: CARD_RADIUS, padding: CARD_PADDING, ...cardShadow },
  lastDecisionResult: { fontSize: 15, fontWeight: '700', color: Colors.ink },
  lastDecisionMeta: { fontSize: 13, color: Colors.inkSoft, marginTop: 2 },
});
