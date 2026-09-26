import { Colors, ResearcherColors } from '@/src/constants/colors';
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

export const feedbackThemes: Record<FeedbackAppearance, FeedbackTheme> = {
  farmer: {
    backdrop: 'rgba(10,59,40,0.45)',
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
  },
  researcher: {
    backdrop: 'rgba(0,0,0,0.6)',
    // Cards on the researcher side are translucent, which would show the
    // backdrop through the dialog — so use a solid tone between bg and card.
    surface: '#0D2F21',
    border: ResearcherColors.cardBorderStrong,
    title: ResearcherColors.text,
    body: ResearcherColors.textSoft,
    primaryBg: ResearcherColors.accent,
    primaryText: ResearcherColors.accentDeepText,
    dangerBg: ResearcherColors.danger,
    dangerText: ResearcherColors.accentDeepText,
    secondaryBorder: ResearcherColors.cardBorderStrong,
    secondaryText: ResearcherColors.text,
    iconBg: 'rgba(127,214,158,0.14)',
    iconColor: ResearcherColors.accent,
    dangerIconBg: 'rgba(224,133,133,0.16)',
    toast: {
      success: { accent: ResearcherColors.accent, iconBg: 'rgba(127,214,158,0.14)' },
      error: { accent: ResearcherColors.danger, iconBg: 'rgba(224,133,133,0.16)' },
      info: { accent: ResearcherColors.amber, iconBg: ResearcherColors.amberBg },
    },
  },
};
