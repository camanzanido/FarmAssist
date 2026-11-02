import { Colors } from '@/src/constants/colors';
import { LANGUAGE_NAMES, LANGUAGES } from '@/src/i18n/dictionary';
import { useCopy, useLanguage } from '@/src/i18n/LanguageContext';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  size?: 'large' | 'compact';
  style?: StyleProp<ViewStyle>;
}

// Each option is named in its own language, so someone who can't read the current one still recognises theirs.
export function LanguagePicker({ size = 'compact', style }: Props) {
  const { language, setLanguage } = useLanguage();
  const { languageCopy } = useCopy();
  const large = size === 'large';

  return (
    <View style={[s.row, large && s.rowLarge, style]} accessibilityRole="radiogroup" accessibilityLabel={languageCopy.label}>
      {LANGUAGES.map(lang => {
        const selected = lang === language;
        return (
          <TouchableOpacity
            key={lang}
            style={[s.option, large && s.optionLarge, selected && s.optionSelected]}
            onPress={() => {
              if (selected) return;
              Haptics.selectionAsync().catch(() => {});
              setLanguage(lang);
            }}
            activeOpacity={0.85}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Text style={[s.text, large && s.textLarge, selected && s.textSelected]}>{LANGUAGE_NAMES[lang]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, backgroundColor: Colors.accentTint, borderRadius: 10, padding: 3 },
  rowLarge: { gap: 8, borderRadius: 14, padding: 4, alignSelf: 'stretch' },
  option: { minHeight: 34, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  optionLarge: { flex: 1, minHeight: 48, borderRadius: 11 },
  optionSelected: { backgroundColor: Colors.ink },
  text: { fontSize: 13, fontWeight: '700', color: Colors.ink },
  textLarge: { fontSize: 16, fontWeight: '800' },
  textSelected: { color: Colors.onDark },
});
