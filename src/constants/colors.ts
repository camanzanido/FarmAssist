
export const Colors = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#E2EAE5',
  borderStrong: '#D3DDD7',
  divider: '#EDF2EF',

  ink: '#0A3B28',
  inkSoft: '#6B7B6E',
  inkFaint: '#7A8A7F',
  placeholder: '#A7B3AB',

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
  inkDim: '#95A39A',
  onDarkBody: '#C8DFD0',
  amberOnDark: '#E0C68F',
  amberDeepText: '#8A6B2E',
  amberBorderStrong: '#E2CFA8',
  dangerBorder: '#EFC6C0',
  dangerText: '#8A3A30',
  tabInactive: '#9AA79D',
  barMuted: '#C9D3CD',
  surfaceAlt: '#F3F8F5',
} as const;

export const ResearcherColors = {
  bg: Colors.bg,
  tabBg: Colors.surface,
  card: Colors.surface,
  fill: Colors.surfaceAlt,
  cardBorder: Colors.border,
  cardBorderStrong: Colors.borderStrong,
  divider: Colors.divider,

  text: Colors.ink,
  textSoft: Colors.inkSoft,
  textFaint: Colors.inkFaint,
  textMuted: Colors.placeholder,

  accent: Colors.accent,
  accentStrong: Colors.ink,
  accentDeepText: Colors.onDark,
  accentTint: Colors.accentTint,

  amber: Colors.amber,
  amberBg: Colors.amberBg,
  amberBorder: Colors.amberBorder,
  amberText: Colors.amberText,

  danger: Colors.danger,
  dangerBg: Colors.dangerBg,
  dangerBorder: Colors.dangerBorder,

  textBody: Colors.inkMuted,
  avatar: Colors.accentTint,
  sheet: Colors.surface,
  headerBg: Colors.surface,
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

// Brand gradient stops, left to right.
export const BrandGradient = ['#006D5B', '#0F7E66', '#58D09B'] as const;

export const brandGradientCss = (angle = 90) =>
  `linear-gradient(${angle}deg, ${BrandGradient[0]} 0%, ${BrandGradient[1]} 50%, ${BrandGradient[2]} 100%)`;

// See-through brand gradient, for pressed states where dark text must stay readable.
export const brandGradientSoftCss = (angle = 90) =>
  `linear-gradient(${angle}deg, rgba(0,109,91,0.14) 0%, rgba(15,126,102,0.12) 50%, rgba(88,208,155,0.18) 100%)`;

// Drop shadow for white cards on the white page.
export const cardShadow = { shadowColor: '#0A3B28', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 } as const;
