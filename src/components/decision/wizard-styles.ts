import { Colors } from '@/src/constants/colors';

export const wizardHeader = {
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { marginBottom: 22 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.ink, lineHeight: 32, letterSpacing: -0.4, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.inkSoft, lineHeight: 20 },
} as const;
