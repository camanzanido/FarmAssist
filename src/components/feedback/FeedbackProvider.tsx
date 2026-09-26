import { useAuth } from '@/src/auth/AuthContext';
import React, { createContext, useContext, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DialogHost } from './dialog-host';
import { DialogQueue, ToastStore } from './feedback-queue';
import { feedbackThemes } from './feedback-theme';
import { ToastHost } from './toast-host';
import type { AlertOptions, ConfirmOptions, ToastOptions } from './types';

type NotifyFn = (title: string, message?: string, options?: Pick<ToastOptions, 'durationMs'>) => number;

export interface FeedbackApi {
  /** Resolves true on confirm; false on cancel, backdrop tap, or the Android back button. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** A single-button dialog for messages the user must acknowledge. Prefer notify for most feedback. */
  alert: (options: AlertOptions) => Promise<void>;
  /** Non-blocking toasts that dismiss themselves. */
  notify: {
    success: NotifyFn;
    error: NotifyFn;
    info: NotifyFn;
    dismiss: (id: number) => void;
  };
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

/**
 * Replaces Alert.alert with themed dialogs and toasts. Must sit inside
 * AuthProvider (the theme follows the signed-in role) and above anything that
 * calls useFeedback.
 */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [dialogs] = useState(() => new DialogQueue());
  const [toasts] = useState(() => new ToastStore());
  const { user } = useAuth();
  const theme = feedbackThemes[user?.user_type === 'researcher' ? 'researcher' : 'farmer'];

  // Stable across renders so it is safe in effect dependency arrays.
  const api = useMemo<FeedbackApi>(() => {
    const toast = (kind: ToastOptions['kind']): NotifyFn => (title, message, options) =>
      toasts.show({ kind, title, message, ...options });
    return {
      confirm: (options) => dialogs.enqueue({ kind: 'confirm', ...options }),
      alert: (options) => dialogs.enqueue({ kind: 'alert', ...options }).then(() => undefined),
      notify: {
        success: toast('success'),
        error: toast('error'),
        info: toast('info'),
        dismiss: (id) => toasts.dismiss(id),
      },
    };
  }, [dialogs, toasts]);

  return (
    <FeedbackContext.Provider value={api}>
      <View style={s.root}>
        {children}
        <ToastHost store={toasts} theme={theme} />
        <DialogHost queue={dialogs} theme={theme} />
      </View>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider');
  return ctx;
}

const s = StyleSheet.create({
  root: { flex: 1 },
});
