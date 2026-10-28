import { Colors } from '@/src/constants/colors';
import type { ToastKind } from './types';

export interface FeedbackTheme {
  backdrop: string;
  surface: string;
  border: string;
  title: string;
  body: string;
  primaryBg: string;
  primaryText: string;
  dangerBg: string;
  dangerText: string;
  secondaryBorder: string;
  secondaryText: string;
  iconBg: string;
  iconColor: string;
  dangerIconBg: string;
  toast: Record<ToastKind, { bg: string; border: string; title: string; body: string; icon: string }>;
}

export type FeedbackAppearance = 'farmer' | 'researcher';

const farmer: FeedbackTheme = {
  backdrop: Colors.scrim,
  surface: Colors.surface,
  border: Colors.border,
  title: Colors.ink,
  body: Colors.inkSoft,
  primaryBg: Colors.dark,
  primaryText: Colors.onDark,
  dangerBg: Colors.danger,
  dangerText: Colors.onDark,
  secondaryBorder: Colors.borderStrong,
  secondaryText: Colors.ink,
  iconBg: Colors.accentTint,
  iconColor: Colors.accent,
  dangerIconBg: Colors.dangerBg,
  toast: {
    success: { bg: Colors.toastSuccessBg, border: Colors.toastSuccessBorder, title: Colors.ink, body: Colors.ink, icon: Colors.accent },
    error: { bg: Colors.toastErrorBg, border: Colors.toastErrorBorder, title: Colors.dangerText, body: Colors.dangerText, icon: Colors.danger },
    info: { bg: Colors.toastWarnBg, border: Colors.toastWarnBorder, title: Colors.amberText, body: Colors.amberText, icon: Colors.amber },
  },
};

export const feedbackThemes: Record<FeedbackAppearance, FeedbackTheme> = {
  farmer,
  researcher: farmer,
};
