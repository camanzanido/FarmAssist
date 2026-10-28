import { Colors } from '@/src/constants/colors';
import { arcDash } from '@/src/utils/donutArc';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

export type DonutSegment = { key: string; value: number; color: string };

type Props = {
  segments: DonutSegment[];
  size?: number;
  stroke?: number;
  centerValue?: string;
  centerLabel?: string;
  accessibilityLabel?: string;
};

const GAP_DEG = 4;
const ENTER_MS = 800;

// A read-only ring of proportional segments, starting at 12 o'clock and running clockwise.
export function DonutChart({ segments, size = 132, stroke = 18, centerValue, centerLabel, accessibilityLabel }: Props) {
  const c = size / 2;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((sum, seg) => sum + Math.max(seg.value, 0), 0);
  const shown = segments.filter(seg => seg.value > 0);
  const gap = shown.length > 1 ? (GAP_DEG / 360) * circumference : 0;

  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    progress.value = reduceMotion ? 1 : withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) });
  }, [reduceMotion, progress]);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ rotate: `${(progress.value - 1) * 120}deg` }, { scale: 0.85 + progress.value * 0.15 }],
  }));

  let start = 0;
  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Animated.View style={ringStyle}>
        <Svg width={size} height={size}>
          <Circle cx={c} cy={c} r={r} stroke={Colors.divider} strokeWidth={stroke} fill="none" />
          {total > 0 && (
            <G rotation={-90} origin={`${c}, ${c}`}>
              {shown.map(seg => {
                const length = (seg.value / total) * circumference;
                const { dash, lead, cap } = arcDash(length, gap, stroke);
                const arc = (
                  <Circle
                    key={seg.key}
                    cx={c}
                    cy={c}
                    r={r}
                    stroke={seg.color}
                    strokeWidth={stroke}
                    strokeLinecap={cap}
                    fill="none"
                    strokeDasharray={`${dash} ${circumference}`}
                    strokeDashoffset={-(start + lead)}
                  />
                );
                start += length;
                return arc;
              })}
            </G>
          )}
        </Svg>
      </Animated.View>
      {(centerValue || centerLabel) && (
        <View style={[StyleSheet.absoluteFill, s.center]} pointerEvents="none">
          {centerValue && <Text style={s.value}>{centerValue}</Text>}
          {centerLabel && <Text style={s.label}>{centerLabel}</Text>}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 22, fontWeight: '800', color: Colors.ink, fontVariant: ['tabular-nums'] },
  label: { fontSize: 11, color: Colors.inkFaint, marginTop: 1 },
});
