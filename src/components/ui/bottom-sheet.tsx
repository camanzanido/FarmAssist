import { Colors } from '@/src/constants/colors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, useWindowDimensions, View,
  type ScrollViewProps, type StyleProp, type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing, runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';

const OPEN = { duration: 320, easing: Easing.out(Easing.cubic) };
const CLOSE = { duration: 260, easing: Easing.in(Easing.cubic) };
const SPRING_BACK = { damping: 20, stiffness: 220 };
const DISMISS_FRACTION = 0.25;
const DISMISS_VELOCITY = 800;

type Props = {
  visible: boolean;
  onClose: () => void;
  avoidKeyboard?: boolean;
  style?: StyleProp<ViewStyle>;
  scrollProps?: Omit<ScrollViewProps, 'onScroll' | 'scrollEventThrottle' | 'bounces' | 'overScrollMode'>;
  children: React.ReactNode;
};

export function BottomSheet({ visible, onClose, avoidKeyboard, style, scrollProps, children }: Props) {
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);
  const sheetHeight = useSharedValue(1);
  const scrollY = useSharedValue(0);
  const dragAnchor = useSharedValue(0);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const requestClose = useCallback(() => closeRef.current(), []);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      dragY.value = 0;
      progress.value = withTiming(1, reduceMotion ? { duration: 0 } : OPEN);
    } else {
      progress.value = withTiming(0, reduceMotion ? { duration: 0 } : CLOSE, finished => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, mounted, reduceMotion, progress, dragY]);

  const release = (velocityY: number) => {
    'worklet';
    if (dragY.value > sheetHeight.value * DISMISS_FRACTION || velocityY > DISMISS_VELOCITY) {
      runOnJS(requestClose)();
    } else {
      dragY.value = withSpring(0, SPRING_BACK);
    }
  };

  const handlePan = Gesture.Pan()
    .onUpdate(e => { dragY.value = Math.max(0, e.translationY); })
    .onEnd(e => release(e.velocityY));

  const scrollGesture = Gesture.Native();
  const bodyPan = Gesture.Pan()
    .simultaneousWithExternalGesture(scrollGesture)
    .activeOffsetY([-10, 10])
    .onStart(() => { dragAnchor.value = 0; })
    .onUpdate(e => {
      if (scrollY.value > 0 && dragY.value === 0) {
        dragAnchor.value = e.translationY;
        return;
      }
      dragY.value = Math.max(0, e.translationY - dragAnchor.value);
    })
    .onEnd(e => {
      if (dragY.value > 0) release(e.velocityY);
    });

  const onScroll = useAnimatedScrollHandler(e => { scrollY.value = e.contentOffset.y; });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * Math.max(0, 1 - dragY.value / sheetHeight.value),
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * height + dragY.value }],
  }));

  const Wrapper = avoidKeyboard ? KeyboardAvoidingView : View;
  const wrapperProps = avoidKeyboard ? { behavior: Platform.OS === 'ios' ? ('padding' as const) : undefined } : {};

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={s.root}>
        <Wrapper style={s.root} {...wrapperProps}>
          <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, backdropStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
          </Animated.View>
          <Animated.View
            style={[s.sheet, style, sheetStyle]}
            onLayout={e => { sheetHeight.value = Math.max(1, e.nativeEvent.layout.height); }}
            accessibilityViewIsModal
          >
            <GestureDetector gesture={handlePan}>
              <View style={s.handleZone} accessibilityHint="Swipe down to close">
                <View style={s.grabber} />
              </View>
            </GestureDetector>
            <GestureDetector gesture={bodyPan}>
              <View style={s.body}>
                <GestureDetector gesture={scrollGesture}>
                  <Animated.ScrollView
                    showsVerticalScrollIndicator={false}
                    {...scrollProps}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    bounces={false}
                    overScrollMode="never"
                  >
                    {children}
                  </Animated.ScrollView>
                </GestureDetector>
              </View>
            </GestureDetector>
          </Animated.View>
        </Wrapper>
      </GestureHandlerRootView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(10,59,40,0.35)' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 34, maxHeight: '92%',
    width: '100%', maxWidth: 640, alignSelf: 'center',
  },
  handleZone: { alignSelf: 'stretch', height: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: Colors.borderStrong },
  body: { flexShrink: 1 },
});
