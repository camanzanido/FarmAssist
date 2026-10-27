import { ICON_SPRING, POP_UP, SETTLE_SPRING } from '@/src/constants/motion';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';

export type IconMotion = 'spin' | 'flip' | 'pop' | 'wiggle';

// Call play() straight from a press handler: no state update or re-render sits between the touch and the first frame.
export function useIconMotion(motion: IconMotion) {
  const reduceMotion = useReducedMotion();
  const turn = useSharedValue(0);
  const scale = useSharedValue(1);

  const play = useCallback(() => {
    if (reduceMotion) return;
    if (motion === 'spin') turn.value = withSpring(turn.value + 90, ICON_SPRING);
    else if (motion === 'flip') turn.value = withSpring(turn.value + 180, ICON_SPRING);
    else if (motion === 'pop') scale.value = withSequence(withTiming(1.18, POP_UP), withSpring(1, SETTLE_SPRING));
    else turn.value = withSequence(withTiming(-12, POP_UP), withSpring(0, { ...SETTLE_SPRING, damping: 9 }));
  }, [motion, reduceMotion, turn, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value}deg` }, { scale: scale.value }],
  }));

  return { style, play };
}

type MotionIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  size: number;
  color: string;
  style: StyleProp<ViewStyle>;
};

// Transform-only and on the UI thread, so it costs nothing on the JS side.
export function MotionIcon({ name, size, color, style }: MotionIconProps) {
  return (
    <Animated.View style={style}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}

type Props = Omit<MotionIconProps, 'style'> & {
  motion: IconMotion;
  // Bump this number to play the motion once; for motion not tied to a press.
  trigger: number;
};

export function AnimatedIcon({ name, size, color, motion, trigger }: Props) {
  const { style, play } = useIconMotion(motion);
  const last = useRef(trigger);

  useEffect(() => {
    if (trigger === last.current) return;
    last.current = trigger;
    play();
  }, [trigger, play]);

  return <MotionIcon name={name} size={size} color={color} style={style} />;
}
