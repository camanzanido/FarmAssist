import { colorAt } from '@/src/components/ui/gradient-text';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming,
} from 'react-native-reanimated';

const STRIP = Array.from({ length: 20 }, (_, i) => String(i % 10));
const STAGGER_MS = 90;
const ROLL_MS = 900;
const MIN_SCALE = 0.5;

type Props = {
  text: string;
  colors: readonly string[];
  style: TextStyle & { lineHeight: number };
};

function Digit({ digit, color, order, style }: { digit: number; color: string; order: number; style: Props['style'] }) {
  const reduceMotion = useReducedMotion();
  const lineHeight = style.lineHeight;
  const target = -(10 + digit) * lineHeight;
  const offset = useSharedValue(reduceMotion ? target : 0);

  useEffect(() => {
    if (reduceMotion) {
      offset.value = target;
      return;
    }
    offset.value = withDelay(order * STAGGER_MS, withTiming(target, { duration: ROLL_MS, easing: Easing.out(Easing.cubic) }));
  }, [target, order, reduceMotion, offset]);

  const stripStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  const textStyle = [style, s.tabular, s.cell, { height: lineHeight, color }];

  return (
    <View style={[s.slot, { height: lineHeight }]}>
      <Text style={[textStyle, s.sizer]}>{digit}</Text>
      <Animated.View style={[s.strip, stripStyle]}>
        {STRIP.map((d, i) => <Text key={i} style={textStyle}>{d}</Text>)}
      </Animated.View>
    </View>
  );
}

export function OdometerText({ text, colors, style }: Props) {
  const chars = Array.from(text);
  const last = Math.max(chars.length - 1, 1);
  let digitOrder = 0;
  const [available, setAvailable] = useState(0);
  const [natural, setNatural] = useState(0);
  const scale = available > 0 && natural > available ? Math.max(available / natural, MIN_SCALE) : 1;

  return (
    <View style={s.fit} onLayout={e => setAvailable(e.nativeEvent.layout.width)}>
      <View
        style={[s.row, scale < 1 && { transform: [{ scale }], transformOrigin: 'left center' }]}
        onLayout={e => setNatural(e.nativeEvent.layout.width)}
        accessible
        accessibilityLabel={text}
      >
        {chars.map((ch, i) => {
          const color = colorAt(colors, i / last);
          if (/[0-9]/.test(ch)) {
            return <Digit key={i} digit={Number(ch)} color={color} order={digitOrder++} style={style} />;
          }
          return <Text key={i} style={[style, s.tabular, s.cell, { height: style.lineHeight, color }]}>{ch}</Text>;
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // A row parent lets the digits measure at full width instead of being capped, so the scale-to-fit can see the overflow.
  fit: { alignSelf: 'stretch', flexDirection: 'row' },
  row: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  tabular: { fontVariant: ['tabular-nums'] },
  cell: { includeFontPadding: false, textAlignVertical: 'center' },
  slot: { overflow: 'hidden' },
  sizer: { opacity: 0 },
  strip: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
});
