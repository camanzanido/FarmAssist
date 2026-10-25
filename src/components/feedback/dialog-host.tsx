import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { EASE_OUT } from '@/src/constants/motion';
import Animated, { FadeIn, Keyframe, useReducedMotion } from 'react-native-reanimated';
import type { DialogQueue } from './feedback-queue';
import type { FeedbackTheme } from './feedback-theme';

// Our own quick fade and scale; Android's Modal fade adds about 300ms before the card shows.
const BACKDROP_IN = FadeIn.duration(180);
const CARD_IN = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.94 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT },
}).duration(200);

interface Props {
  queue: DialogQueue;
  theme: FeedbackTheme;
}

export function DialogHost({ queue, theme: t }: Props) {
  const current = useSyncExternalStore(queue.subscribe, queue.getCurrent);
  const reduceMotion = useReducedMotion();
  // Keep rendering the last dialog until the Modal has closed; taps on it are ignored by the queue.
  const lastShown = useRef(current);
  if (current) lastShown.current = current;
  const shown = current ?? lastShown.current;
  const request = shown?.request;
  const destructive = request?.tone === 'destructive';

  const openId = current?.id;
  useEffect(() => {
    if (openId !== undefined && destructive) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  }, [openId, destructive]);

  if (!shown || !request) return null;

  const settle = (value: boolean) => queue.resolve(shown.id, value);
  const isConfirm = request.kind === 'confirm';
  const backdropCancels = isConfirm && request.dismissible !== false;
  const icon = request.icon ?? (destructive ? 'alert-circle-outline' : undefined);

  const primaryLabel = isConfirm ? request.confirmText ?? 'Confirm' : request.buttonText ?? 'OK';
  const cancelLabel = isConfirm ? request.cancelText ?? 'Cancel' : null;

  return (
    // A single Modal stays open while the queue has entries; queued dialogs
    // swap content inside it instead of opening a second Modal.
    <Modal
      visible={current !== null}
      transparent
      animationType="none"
      statusBarTranslucent
      // Android back button: treat as the safe choice.
      onRequestClose={() => settle(false)}
    >
      <Pressable
        style={s.backdrop}
        onPress={backdropCancels ? () => settle(false) : undefined}
        accessible={false}
      >
        <Animated.View
          entering={reduceMotion ? undefined : BACKDROP_IN}
          style={[StyleSheet.absoluteFill, { backgroundColor: t.backdrop }]}
          pointerEvents="none"
        />
        <Animated.View
          key={shown.id}
          entering={reduceMotion ? undefined : CARD_IN}
          style={[s.card, { backgroundColor: t.surface, borderColor: t.border }]}
          accessibilityViewIsModal
          accessibilityRole="alert"
          // Stop taps on the card from reaching the backdrop.
          onStartShouldSetResponder={() => true}
        >
          {icon ? (
            <View style={[s.iconWrap, { backgroundColor: destructive ? t.dangerIconBg : t.iconBg }]}>
              <Ionicons name={icon} size={28} color={destructive ? t.dangerBg : t.iconColor} />
            </View>
          ) : null}

          <Text style={[s.title, { color: t.title }]} accessibilityRole="header">
            {request.title}
          </Text>
          {request.message ? <Text style={[s.message, { color: t.body }]}>{request.message}</Text> : null}

          <View style={s.actions}>
            {cancelLabel ? (
              <Pressable
                onPress={() => settle(false)}
                style={({ pressed }) => [
                  s.button,
                  s.secondary,
                  { borderColor: t.secondaryBorder },
                  pressed && s.pressed,
                ]}
                accessibilityRole="button"
              >
                <Text style={[s.buttonText, { color: t.secondaryText }]}>{cancelLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => settle(true)}
              style={({ pressed }) => [
                s.button,
                { backgroundColor: destructive ? t.dangerBg : t.primaryBg },
                pressed && s.pressed,
              ]}
              accessibilityRole="button"
            >
              <Text style={[s.buttonText, { color: destructive ? t.dangerText : t.primaryText }]}>
                {primaryLabel}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    paddingTop: 24,
    paddingHorizontal: 22,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    alignSelf: 'stretch',
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
