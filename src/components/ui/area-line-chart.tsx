import { BrandGradient, Colors } from '@/src/constants/colors';
import { areaPath, chartPoints, nearestSlot, slotX, smoothLinePath } from '@/src/utils/chartPaths';
import React, { useEffect, useId, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

const DRAW_MS = 750;
const LABEL_WIDTH = 36;
const PAD_X = LABEL_WIDTH / 2;
const BUBBLE_GAP = 10;

export type ChartSlot = { key: string; label: string; fullLabel?: string; value: number | null };

type Props = {
  points: ChartSlot[];
  height?: number;
  unit?: { one: string; many: string };
  // Must match the card behind the chart: the reveal slides a cover of this colour off to the right.
  coverColor?: string;
  accessibilityLabel?: string;
};

// Smooth brand-gradient line over a soft fill; null values (months still to come) are left off the line.
export function AreaLineChart({ points, height = 120, unit = { one: 'item', many: 'items' }, coverColor = Colors.surface, accessibilityLabel }: Props) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [bubbleWidth, setBubbleWidth] = useState(0);
  const reduceMotion = useReducedMotion();
  const reveal = useSharedValue(reduceMotion ? 1 : 0);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const slots = points.length;

  const { line, area, pts, hasData } = useMemo(() => {
    const firstEmpty = points.findIndex(p => p.value === null);
    const values = (firstEmpty === -1 ? points : points.slice(0, firstEmpty)).map(p => p.value ?? 0);
    const xy = chartPoints(values, width, height, PAD_X, 6, slots);
    const d = smoothLinePath(xy);
    return { line: d, area: areaPath(xy, d, height), pts: xy, hasData: values.some(v => v > 0) };
  }, [points, width, height, slots]);

  useEffect(() => { setSelected(null); }, [points]);

  useEffect(() => {
    if (width === 0) return;
    reveal.value = reduceMotion ? 1 : withTiming(1, { duration: DRAW_MS, easing: Easing.inOut(Easing.cubic) });
  }, [width, reduceMotion, reveal]);

  // Transform only, so the reveal runs on the UI thread without re-rendering the SVG.
  const coverStyle = useAnimatedStyle(() => ({ transform: [{ translateX: reveal.value * (width + 12) }] }));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== width) setWidth(w);
  };

  const onPress = (e: GestureResponderEvent) => {
    const i = nearestSlot(e.nativeEvent.locationX, slots, width, PAD_X, pts.length);
    if (i < 0) return;
    setSelected(prev => (prev === i ? null : i));
  };

  const last = pts[pts.length - 1];
  const sel = selected !== null ? pts[selected] : undefined;
  const selValue = selected !== null ? points[selected]?.value ?? 0 : 0;
  const bubbleAbove = sel ? sel.y - 34 - BUBBLE_GAP >= 0 : true;
  const bubbleLeft = sel ? Math.min(Math.max(sel.x - bubbleWidth / 2, 0), Math.max(width - bubbleWidth, 0)) : 0;
  // Busy axes show every other month, but always the latest and the tapped one.
  const showLabel = (i: number) => slots <= 6 || i % 2 === 0 || i === pts.length - 1 || i === selected;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} accessibilityHint="Tap a month to see its count">
      <Pressable onPress={onPress} style={[s.plot, { height }]} onLayout={onLayout}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id={`line${id}`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={BrandGradient[0]} />
                <Stop offset="0.5" stopColor={BrandGradient[1]} />
                <Stop offset="1" stopColor={BrandGradient[2]} />
              </LinearGradient>
              <LinearGradient id={`area${id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={BrandGradient[1]} stopOpacity={0.28} />
                <Stop offset="1" stopColor={BrandGradient[1]} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {hasData && <Path d={area} fill={`url(#area${id})`} />}
            {sel && <Line x1={sel.x} y1={sel.y} x2={sel.x} y2={height} stroke={Colors.borderStrong} strokeWidth={1.5} strokeDasharray="4 4" />}
            <Path d={line} stroke={`url(#line${id})`} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {last && <Circle cx={last.x} cy={last.y} r={4.5} fill={Colors.surface} stroke={BrandGradient[2]} strokeWidth={3} />}
            {sel && <Circle cx={sel.x} cy={sel.y} r={5.5} fill={Colors.ink} stroke={Colors.surface} strokeWidth={2.5} />}
          </Svg>
        )}
        {width > 0 && !reduceMotion && (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: coverColor }, coverStyle]} />
        )}
      </Pressable>

      {sel && selected !== null && (
        <View
          pointerEvents="none"
          onLayout={e => setBubbleWidth(Math.round(e.nativeEvent.layout.width))}
          style={[s.bubble, { left: bubbleLeft, top: bubbleAbove ? sel.y - 34 - BUBBLE_GAP : sel.y + BUBBLE_GAP + 4, opacity: bubbleWidth ? 1 : 0 }]}
        >
          <Text style={s.bubbleText} numberOfLines={1}>
            {points[selected].fullLabel ?? points[selected].label} · {selValue.toLocaleString()} {selValue === 1 ? unit.one : unit.many}
          </Text>
        </View>
      )}

      <View style={s.labels}>
        {width > 0 && points.map((p, i) => showLabel(i) && (
          <Text
            key={p.key}
            style={[s.label, { left: slotX(i, slots, width, PAD_X) - LABEL_WIDTH / 2 }, (i === selected || (selected === null && i === pts.length - 1)) && s.labelActive]}
          >
            {p.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  plot: { overflow: 'hidden' },
  labels: { height: 16, marginTop: 8 },
  label: { position: 'absolute', width: LABEL_WIDTH, textAlign: 'center', fontSize: 10, color: Colors.inkFaint },
  labelActive: { fontWeight: '700', color: Colors.accent },
  bubble: { position: 'absolute', height: 30, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 8, backgroundColor: Colors.ink },
  bubbleText: { fontSize: 12, fontWeight: '700', color: Colors.onDark },
});
