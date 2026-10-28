import { PRESSED_SCALE, PRESS_IN_SPRING, PRESS_OUT_SPRING } from '@/src/constants/motion';
import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// For an existing Pressable: spread the handlers on it and put scaleStyle on an Animated.View around it.
export function usePressScale() {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = useCallback(() => {
    if (!reduceMotion) scale.value = withSpring(PRESSED_SCALE, PRESS_IN_SPRING);
  }, [reduceMotion, scale]);
  const onPressOut = useCallback(() => {
    if (!reduceMotion) scale.value = withSpring(1, PRESS_OUT_SPRING);
  }, [reduceMotion, scale]);
  return { scaleStyle, onPressIn, onPressOut };
}

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  // A light tap on press, for the main action on a screen.
  haptic?: boolean;
};

// iOS-style touch feedback: the surface sinks slightly under the finger and springs back, all on the UI thread.
export function PressableScale({ style, haptic, onPressIn, onPressOut, onPress, children, ...rest }: Props) {
  const press = usePressScale();

  const handlePressIn = (e: GestureResponderEvent) => {
    press.onPressIn();
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    press.onPressOut();
    onPressOut?.(e);
  };

  const handlePress = (e: GestureResponderEvent) => {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(e);
  };

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[style, press.scaleStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
