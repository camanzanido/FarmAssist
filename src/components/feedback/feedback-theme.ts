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
  toast: Record<ToastKind, { accent: string; iconBg: string }>;
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
    success: { accent: Colors.accent, iconBg: Colors.accentTint },
    error: { accent: Colors.danger, iconBg: Colors.dangerBg },
    info: { accent: Colors.amber, iconBg: Colors.amberBg },
  },
};

export const feedbackThemes: Record<FeedbackAppearance, FeedbackTheme> = {
  farmer,
  researcher: farmer,
};
