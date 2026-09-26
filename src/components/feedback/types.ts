import type { Ionicons } from '@expo/vector-icons';

export type IconName = keyof typeof Ionicons.glyphMap;

export type DialogTone = 'default' | 'destructive';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: DialogTone;
  icon?: IconName;
  /** Whether tapping the backdrop cancels. The Android back button always cancels. Default true. */
  dismissible?: boolean;
}

export interface AlertOptions {
  title: string;
  message?: string;
  buttonText?: string;
  tone?: DialogTone;
  icon?: IconName;
}

export type DialogRequest =
  | ({ kind: 'confirm' } & ConfirmOptions)
  | ({ kind: 'alert' } & AlertOptions);

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastOptions {
  kind: ToastKind;
  title: string;
  message?: string;
  durationMs?: number;
}

export interface Toast extends ToastOptions {
  id: number;
  durationMs: number;
}
