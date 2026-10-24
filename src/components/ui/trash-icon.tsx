import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

type Props = { size: number; color: string; open: boolean };

const STROKE = 1.8;

// Outline trash can whose lid tips open around its left hinge while `open` is true.
export function TrashIcon({ size, color, open }: Props) {
  const reduceMotion = useReducedMotion();
  const lid = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    const to = open ? 1 : 0;
    lid.value = reduceMotion ? to : withTiming(to, { duration: 180, easing: Easing.out(Easing.cubic) });
  }, [open, reduceMotion, lid]);

  const lidStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -1.5 * lid.value }, { rotate: `${-28 * lid.value}deg` }],
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M6 8.5l0.9 11.6a1.5 1.5 0 0 0 1.5 1.4h7.2a1.5 1.5 0 0 0 1.5-1.4L18 8.5M10 11.5v6M14 11.5v6"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, s.hinge, lidStyle]}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 6h16M9.5 6V4.2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V6"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  hinge: { transformOrigin: '17% 25%' },
});
