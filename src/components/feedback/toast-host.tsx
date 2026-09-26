import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ToastStore } from './feedback-queue';
import type { FeedbackTheme } from './feedback-theme';
import type { IconName, Toast, ToastKind } from './types';

const ICONS: Record<ToastKind, IconName> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  info: 'information-circle',
};

const HAPTICS: Record<ToastKind, Haptics.NotificationFeedbackType | null> = {
  success: Haptics.NotificationFeedbackType.Success,
  error: Haptics.NotificationFeedbackType.Error,
  info: null,
};

interface Props {
  store: ToastStore;
  theme: FeedbackTheme;
}

export function ToastHost({ store, theme }: Props) {
  const toasts = useSyncExternalStore(store.subscribe, store.getToasts);
  const insets = useSafeAreaInsets();

  return (
    // box-none: the empty area around toasts must not block taps on the screen below.
    <View pointerEvents="box-none" style={[s.container, { top: insets.top + 8 }]}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} theme={theme} onDismiss={() => store.dismiss(toast.id)} />
      ))}
    </View>
  );
}

function ToastItem({ toast, theme, onDismiss }: { toast: Toast; theme: FeedbackTheme; onDismiss: () => void }) {
  const palette = theme.toast[toast.kind];

  useEffect(() => {
    const haptic = HAPTICS[toast.kind];
    if (haptic) Haptics.notificationAsync(haptic).catch(() => {});
    AccessibilityInfo.announceForAccessibility(
      toast.message ? `${toast.title}. ${toast.message}` : toast.title
    );
    const timer = setTimeout(onDismiss, toast.durationMs);
    return () => clearTimeout(timer);
    // onDismiss is recreated each render of the host; the toast id is the real identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      exiting={FadeOutUp.duration(180)}
      layout={LinearTransition}
    >
      <Pressable
        onPress={onDismiss}
        style={[s.toast, { backgroundColor: theme.surface, borderColor: theme.border }]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityHint="Tap to dismiss"
      >
        <View style={[s.accent, { backgroundColor: palette.accent }]} />
        <View style={[s.iconWrap, { backgroundColor: palette.iconBg }]}>
          <Ionicons name={ICONS[toast.kind]} size={20} color={palette.accent} />
        </View>
        <View style={s.textWrap}>
          <Text style={[s.title, { color: theme.title }]} numberOfLines={2}>
            {toast.title}
          </Text>
          {toast.message ? (
            <Text style={[s.message, { color: theme.body }]} numberOfLines={4}>
              {toast.message}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    gap: 8,
    zIndex: 1000,
    elevation: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});
