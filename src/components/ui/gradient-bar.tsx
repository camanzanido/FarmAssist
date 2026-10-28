import { brandGradientCss, Colors } from '@/src/constants/colors';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const GROW_MS = 600;
const STAGGER_MS = 60;

type Props = { pct: number; order?: number };

// Brand-gradient progress bar that grows in from the left; scaleX keeps it off the layout pass.
export function GradientBar({ pct, order = 0 }: Props) {
  const reduceMotion = useReducedMotion();
  const grow = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    grow.value = reduceMotion ? 1 : withDelay(order * STAGGER_MS, withTiming(1, { duration: GROW_MS, easing: Easing.out(Easing.cubic) }));
  }, [order, reduceMotion, grow]);
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: grow.value }] }));

  return (
    <View style={s.track}>
      <Animated.View style={[s.fill, { width: `${Math.max(Math.min(pct, 100), 0)}%` }, fillStyle]} />
    </View>
  );
}

const s = StyleSheet.create({
  track: { height: 8, backgroundColor: Colors.divider, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, transformOrigin: 'left', experimental_backgroundImage: brandGradientCss(90) },
});
