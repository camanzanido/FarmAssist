import { Colors, ForecastColors } from '@/src/constants/colors';
import { resultCopy } from '@/src/constants/copy';
import {
  angleToPercent, applyDrag, continueDrag, nearestBoundary, percentToPoint, startDrag, type Boundary,
} from '@/src/utils/forecastSplit';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  driest: number;
  wettest: number;
  size?: number;
  stroke?: number;
  labels?: Record<BandKey, string>;
  onChange?: (driest: number, wettest: number) => void;
};

type BandKey = 'dry' | 'average' | 'wet';

const BANDS: { key: BandKey; color: string }[] = [
  { key: 'dry', color: ForecastColors.dry },
  { key: 'average', color: ForecastColors.average },
  { key: 'wet', color: ForecastColors.wet },
];

// Draws the dry / average / wet split as a ring; with onChange, the two band boundaries can be dragged.
export function ForecastDonut({ driest, wettest, size = 200, stroke = 26, labels = resultCopy.normalYearLegend, onChange }: Props) {
  const interactive = !!onChange;
  const handleR = interactive ? stroke * 0.62 : 0;
  const c = size / 2;
  const r = c - Math.max(stroke / 2, handleR) - 2;
  const circumference = 2 * Math.PI * r;
  const average = Math.max(0, 100 - driest - wettest);
  const split = [driest, average, Math.min(wettest, Math.max(0, 100 - driest))];

  const [active, setActive] = useState<Boundary | null>(null);
  const latest = useRef({ driest, wettest });
  latest.current = { driest, wettest };
  const drag = useRef<{ boundary: Boundary; track: number; pct: number } | null>(null);

  const touchPct = (x: number, y: number) => angleToPercent(x - c, y - c);
  const onRing = (x: number, y: number) => Math.abs(Math.hypot(x - c, y - c) - r) <= stroke * 1.4;

  const pan = Gesture.Pan()
    .enabled(interactive)
    .runOnJS(true)
    .minDistance(0)
    .onBegin(e => {
      if (!onRing(e.x, e.y)) return;
      const pct = touchPct(e.x, e.y);
      const boundary = nearestBoundary(pct, latest.current);
      drag.current = { boundary, track: startDrag(boundary, pct, latest.current), pct };
      setActive(boundary);
    })
    .onUpdate(e => {
      const d = drag.current;
      if (!d || !onChange) return;
      const pct = touchPct(e.x, e.y);
      d.track = continueDrag(d.track, d.pct, pct);
      d.pct = pct;
      const next = applyDrag(d.boundary, d.track, latest.current);
      if (next.driest !== latest.current.driest || next.wettest !== latest.current.wettest) {
        latest.current = next;
        onChange(next.driest, next.wettest);
      }
    })
    .onFinalize(() => {
      drag.current = null;
      setActive(null);
    });

  const shownIndex = active === 'dry' ? 0 : active === 'wet' ? 2 : interactive ? 1 : split.indexOf(Math.max(...split));
  const shown = BANDS[shownIndex];

  let start = 0;
  const arcs = BANDS.map((band, i) => {
    const from = start;
    start += split[i];
    if (split[i] <= 0) return null;
    return (
      <Circle
        key={band.key}
        cx={c}
        cy={c}
        r={r}
        stroke={band.color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${(split[i] / 100) * circumference} ${circumference}`}
        rotation={-90 + from * 3.6}
        origin={`${c}, ${c}`}
      />
    );
  });

  const handles = interactive
    ? ([['dry', driest], ['wet', 100 - wettest]] as const).map(([key, pct]) => {
        const p = percentToPoint(pct, r, c, c);
        const isActive = active === key;
        return (
          <Circle
            key={key}
            cx={p.x}
            cy={p.y}
            r={isActive ? handleR + 2 : handleR}
            fill={Colors.surface}
            stroke={Colors.ink}
            strokeWidth={isActive ? 3 : 2}
          />
        );
      })
    : null;

  const a11y = BANDS.map((b, i) => `${split[i]}% ${labels[b.key].toLowerCase()}`).join(', ');

  const body = (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel={a11y}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke={Colors.divider} strokeWidth={stroke} fill="none" />
        {arcs}
        {handles}
      </Svg>
      <View style={s.center} pointerEvents="none">
        <Text style={[s.centerPct, { fontSize: size * 0.17, color: shown.color }]}>{split[shownIndex]}%</Text>
        <Text style={[s.centerLabel, { fontSize: Math.max(11, size * 0.065) }]}>{labels[shown.key]}</Text>
      </View>
    </View>
  );

  if (!interactive) return body;
  return (
    <GestureHandlerRootView style={{ width: size, height: size }}>
      <GestureDetector gesture={pan}>{body}</GestureDetector>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  centerPct: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  centerLabel: { fontWeight: '700', color: Colors.inkSoft, marginTop: 2 },
});
