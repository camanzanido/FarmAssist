import { Skeleton, SkeletonGroup } from '@/src/components/ui/skeleton';
import { CARD_PADDING, cardSurface, Colors } from '@/src/constants/colors';
import { BUTTON_HEIGHT, contentColumn } from '@/src/constants/layout';
import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function Loading({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <SkeletonGroup>
      <View style={style} accessibilityLabel="Loading" accessibilityRole="progressbar">
        {children}
      </View>
    </SkeletonGroup>
  );
}

function HistoryCard() {
  return (
    <View style={s.card}>
      <Skeleton width={44} height={44} radius={13} />
      <View style={s.cardBody}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="38%" height={11} />
        <View style={s.metaRow}>
          <Skeleton width={70} height={12} />
          <Skeleton width={46} height={12} />
          <Skeleton width={54} height={16} radius={6} />
        </View>
      </View>
      <Skeleton width={36} height={36} radius={18} />
    </View>
  );
}

export function HistorySkeleton({ withHeader = true }: { withHeader?: boolean }) {
  return (
    <Loading style={s.page}>
      {withHeader && (
        <>
          <Skeleton width={140} height={27} radius={8} />
          <Skeleton width={200} height={13} style={s.gapSm} />
          <View style={[s.row, s.gapLg]}>
            {[48, 96, 132, 150].map(w => <Skeleton key={w} width={w} height={34} radius={999} />)}
          </View>
        </>
      )}
      <Skeleton width={110} height={11} style={s.gapXl} />
      <View style={s.gapMd}>
        {[0, 1, 2, 3, 4].map(i => <HistoryCard key={i} />)}
      </View>
    </Loading>
  );
}

export function ResultSkeleton({ withTopRow = true }: { withTopRow?: boolean }) {
  const { height } = useWindowDimensions();
  return (
    <Loading style={s.fill}>
      <View style={[s.resultHero, { minHeight: Math.round(height * 0.72) }]}>
        {withTopRow && (
          <View style={s.rowBetween}>
            <Skeleton width={28} height={22} radius={6} />
            <Skeleton width={110} height={28} radius={999} />
          </View>
        )}
        <View style={s.resultVerdict}>
          <Skeleton width={90} height={11} />
          <Skeleton width="72%" height={32} radius={8} style={s.gapMd} />
          <Skeleton width="56%" height={32} radius={8} style={s.gapSm} />
          <Skeleton width="48%" height={40} radius={10} style={s.gapLg} />
          <Skeleton width="80%" height={14} style={s.gapMd} />
          <Skeleton width="64%" height={14} style={s.gapSm} />
        </View>
      </View>
      <View style={s.resultBody}>
        <Skeleton width={200} height={15} />
        <View style={s.columns}>
          <Skeleton width={64} height={130} radius={12} />
          <Skeleton width={64} height={80} radius={12} />
        </View>
      </View>
    </Loading>
  );
}

export function AppStartSkeleton() {
  return (
    <SafeAreaView style={s.safe}>
      <Loading style={s.fill}>
        <View style={s.page}>
          <Skeleton width={120} height={12} />
          <Skeleton width="70%" height={30} radius={8} style={s.gapSm} />
          <Skeleton width="50%" height={30} radius={8} style={s.gapSm} />
          <View style={s.gapXl}>
            {[0, 1, 2].map(i => (
              <View key={i} style={s.card}>
                <Skeleton width={48} height={48} radius={14} />
                <View style={s.cardBody}>
                  <Skeleton width="55%" height={16} />
                  <Skeleton width="85%" height={12} />
                </View>
              </View>
            ))}
          </View>
        </View>
        <View style={s.tabBar}>
          {[0, 1, 2].map(i => (
            <View key={i} style={s.tabItem}>
              <Skeleton width={26} height={26} radius={8} />
              <Skeleton width={40} height={9} />
            </View>
          ))}
        </View>
      </Loading>
    </SafeAreaView>
  );
}

export function AuthFormSkeleton() {
  return (
    <SafeAreaView style={s.safe}>
      <Loading style={[s.page, s.authPage]}>
        <Skeleton width={84} height={84} radius={42} style={s.center} />
        <Skeleton width="60%" height={26} radius={8} style={[s.center, s.gapXl]} />
        <Skeleton width="75%" height={13} style={[s.center, s.gapSm]} />
        <Skeleton height={54} radius={14} style={s.gapXl} />
        <Skeleton height={54} radius={14} style={s.gapMd} />
        <Skeleton height={BUTTON_HEIGHT} radius={12} style={s.gapXl} />
      </Loading>
    </SafeAreaView>
  );
}

export function PickerRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Loading>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={s.pickerRow}>
          <View style={s.cardBody}>
            <Skeleton width="55%" height={15} />
            <Skeleton width="35%" height={11} />
          </View>
          <Skeleton width={64} height={14} />
        </View>
      ))}
    </Loading>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  fill: { flex: 1, backgroundColor: Colors.bg },
  page: { ...contentColumn, paddingHorizontal: 24, paddingTop: 16 },
  authPage: { paddingTop: 72 },
  center: { alignSelf: 'center' },
  gapSm: { marginTop: 8 },
  gapMd: { marginTop: 14 },
  gapLg: { marginTop: 18 },
  gapXl: { marginTop: 28 },
  row: { flexDirection: 'row', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 4 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    ...cardSurface, padding: CARD_PADDING, marginBottom: 11,
  },
  cardBody: { flex: 1, gap: 8 },

  resultHero: { ...contentColumn, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 28 },
  resultVerdict: { flex: 1, justifyContent: 'flex-end', maxWidth: '72%' },
  resultBody: { ...contentColumn, paddingHorizontal: 22, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.divider },
  columns: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 36, marginTop: 20 },

  tabBar: {
    flexDirection: 'row', justifyContent: 'space-around', marginTop: 'auto',
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface,
  },
  tabItem: { alignItems: 'center', gap: 6 },

  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 14, marginBottom: 10,
  },
});
