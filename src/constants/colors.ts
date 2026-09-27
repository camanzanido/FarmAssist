
export const Colors = {
  bg: '#F5F0E8',
  surface: '#FFFFFF',
  border: '#E8E2D6',
  borderStrong: '#E0D9CE',
  divider: '#F0EBE0',

  ink: '#0A3B28',
  inkSoft: '#6B7B6E',
  inkFaint: '#8A8070',
  placeholder: '#B0A898',

  accent: '#2E7D52',
  accentSoft: '#5A9A6E',
  accentTint: '#EAF2EC',
  accentTintStrong: '#A8D4B4',

  dark: '#0A3B28',
  onDark: '#FFFFFF',
  onDarkSoft: '#A8D4B4',
  onDarkFaint: '#7FB394',
  onDarkMuted: '#5E7F6C',
  onDarkCard: 'rgba(255,255,255,0.07)',
  onDarkCardBorder: 'rgba(255,255,255,0.14)',
  onDarkDivider: 'rgba(255,255,255,0.12)',

  amber: '#B8791F',
  amberBg: '#FBF3E4',
  amberBorder: '#EBD9B6',
  amberText: '#7A5A1E',

  danger: '#C0392B',
  dangerBg: '#FBEAEA',

  disabled: '#B0C4B8',

  inkMuted: '#5C6B60',
  inkDim: '#A39A8B',
  onDarkBody: '#C8DFD0',
  amberOnDark: '#E0C68F',
  amberDeepText: '#8A6B2E',
  amberBorderStrong: '#E2CFA8',
  dangerBorder: '#EFC6C0',
  dangerText: '#8A3A30',
  tabInactive: '#9AA79D',
  barMuted: '#C5BFB3',
  surfaceAlt: '#F8F5F0',
} as const;

// Researcher side: same hues, inverted — forest is the surface, not the accent.
export const ResearcherColors = {
  bg: '#062318',
  tabBg: '#041A12',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.12)',
  cardBorderStrong: 'rgba(255,255,255,0.2)',
  divider: 'rgba(255,255,255,0.08)',

  text: '#FFFFFF',
  textSoft: '#8FB9A1',
  textFaint: '#5E9C79',
  textMuted: '#4E7561',

  accent: '#7FD69E',
  accentStrong: '#A8D4B4',
  accentDeepText: '#062318',

  amber: '#E0A93F',
  amberBg: 'rgba(184,121,31,0.16)',
  amberBorder: 'rgba(224,169,63,0.35)',
  amberText: '#E0C68F',

  danger: '#E08585',

  textBody: '#C8DFD0',
  avatar: '#2F6B52',
  sheet: '#0B2E20',
  headerBg: '#0C3324',
} as const;

export const ClimateColors = {
  driest: '#D4845A',
  below_ave: '#C9A85A',
  average: '#5A9A6E',
  above_ave: '#4A8BBF',
  wettest: '#4A7FB5',
} as const;

// The three forecast bands (dry / average / wet years), as on the forecast input screen.
export const ForecastColors = {
  dry: ClimateColors.driest,
  average: '#C9BE9E',
  averageText: '#43391F',
  wet: ClimateColors.above_ave,
} as const;
