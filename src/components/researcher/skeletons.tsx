import { Skeleton, SkeletonGroup } from '@/src/components/ui/skeleton';
import { CARD_PADDING, cardShadow, cardSurface, Colors } from '@/src/constants/colors';
import { useIsWide, wideColumn } from '@/src/constants/layout';
import React from 'react';
import { StyleSheet, View } from 'react-native';

function Rows({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={s.row}>
          <Skeleton width={44} height={44} radius={13} />
          <View style={s.rowBody}>
            <Skeleton width="62%" height={15} />
            <Skeleton width="44%" height={11} />
            <Skeleton width="30%" height={11} />
          </View>
        </View>
      ))}
    </>
  );
}

export function ListRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <SkeletonGroup>
      <View accessibilityLabel="Loading" accessibilityRole="progressbar">
        <Rows rows={rows} />
      </View>
    </SkeletonGroup>
  );
}

export function ListScreenSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <SkeletonGroup>
      <View style={s.screen} accessibilityLabel="Loading" accessibilityRole="progressbar">
        <Skeleton width={150} height={26} radius={8} />
        <Skeleton width={110} height={12} style={s.gapSm} />
        <Skeleton height={48} radius={13} style={s.gapLg} />
        <View style={[s.chips, s.gapMd]}>
          {[52, 92, 118, 104].map(w => <Skeleton key={w} width={w} height={34} radius={999} />)}
        </View>
        <View style={s.gapLg}>
          <Rows rows={rows} />
        </View>
      </View>
    </SkeletonGroup>
  );
}

export function OverviewSkeleton() {
  const isWide = useIsWide();
  const statCard = (key: number) => (
    <View key={key} style={[s.card, s.stat]}>
      <Skeleton width="55%" height={26} radius={8} />
      <Skeleton width="70%" height={11} style={s.gapSm} />
      <Skeleton width="45%" height={10} style={s.gapSm} />
    </View>
  );
  return (
    <SkeletonGroup>
      <View style={s.screen} accessibilityLabel="Loading" accessibilityRole="progressbar">
        <Skeleton width={140} height={26} radius={8} />
        <Skeleton width={130} height={34} radius={17} style={s.gapLg} />
        <View style={[s.statGrid, isWide && s.statGridWide, s.gapMd]}>
          <View style={s.statRow}>{[0, 1].map(statCard)}</View>
          <View style={s.statRow}>{[2, 3].map(statCard)}</View>
        </View>
        <ChartSections />
      </View>
    </SkeletonGroup>
  );
}

function ChartSections() {
  const isWide = useIsWide();
  return (
    <>
      <View style={s.section}>
        <Skeleton width="45%" height={14} />
        <Skeleton height={110} radius={10} style={s.gapMd} />
      </View>
      <View style={isWide && s.splitRow}>
        <View style={[s.section, isWide && s.typesCol]}>
          <Skeleton width="70%" height={14} />
          <View style={[s.typesBody, s.gapMd]}>
            <Skeleton width={112} height={112} radius={56} />
            <View style={s.legend}>
              {[0, 1, 2].map(i => <Skeleton key={i} width="90%" height={12} />)}
            </View>
          </View>
        </View>
        <View style={[s.section, isWide && s.muniCol]}>
          <Skeleton width="55%" height={14} />
          {[0, 1, 2, 3].map(i => <Skeleton key={i} height={10} radius={5} style={s.gapMd} />)}
        </View>
      </View>
    </>
  );
}

export function ChartCardsSkeleton() {
  return (
    <SkeletonGroup>
      <ChartSections />
    </SkeletonGroup>
  );
}

export function MapSkeleton() {
  return (
    <SkeletonGroup>
      <View style={s.fill} accessibilityLabel="Loading" accessibilityRole="progressbar">
        <Skeleton height="100%" radius={0} />
        <View style={s.mapPanel}>
          <View style={s.mapHandle} />
          <Skeleton height={46} radius={13} />
          <View style={s.compactRow}>
            <View style={s.rowBody}>
              <Skeleton width="45%" height={14} />
              <Skeleton width="30%" height={10} />
            </View>
            <Skeleton width={90} height={12} />
          </View>
        </View>
      </View>
    </SkeletonGroup>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  screen: { ...wideColumn, padding: 20, paddingTop: 12 },
  gapSm: { marginTop: 7 },
  gapMd: { marginTop: 14 },
  gapLg: { marginTop: 18 },
  chips: { flexDirection: 'row', gap: 8 },

  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 13,
    backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    padding: 16, marginBottom: 11, ...cardShadow,
  },
  rowBody: { flex: 1, gap: 8 },

  card: { ...cardSurface, padding: CARD_PADDING },
  statGrid: { gap: 10 },
  statGridWide: { flexDirection: 'row' },
  statRow: { flex: 1, flexDirection: 'row', gap: 10 },
  stat: { flex: 1, padding: 16 },
  section: { ...cardSurface, padding: CARD_PADDING, marginTop: 12 },
  splitRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  typesCol: { flex: 2 },
  muniCol: { flex: 3 },
  typesBody: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legend: { flex: 1, gap: 12 },

  mapPanel: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingTop: 10, gap: 10,
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, ...cardShadow,
  },
  mapHandle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: Colors.borderStrong },
  compactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 11,
  },
});
