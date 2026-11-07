import { Colors, inputSurface } from '@/src/constants/colors';
import { LANGUAGE_NAMES, LANGUAGES } from '@/src/i18n/dictionary';
import { useCopy, useLanguage } from '@/src/i18n/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { PopoverMenu } from './popover-menu';

interface Props {
  size?: 'large' | 'compact' | 'icon';
  style?: StyleProp<ViewStyle>;
}

// Each option is named in its own language, so someone who can't read the current one still recognises theirs.
export function LanguagePicker({ size = 'compact', style }: Props) {
  const { language, setLanguage } = useLanguage();
  const { languageCopy } = useCopy();
  const large = size === 'large';

  const items = LANGUAGES.map(lang => ({
    key: lang,
    label: LANGUAGE_NAMES[lang],
    selected: lang === language,
    onPress: () => {
      if (lang === language) return;
      Haptics.selectionAsync().catch(() => {});
      setLanguage(lang);
    },
  }));
  const label = `${languageCopy.label}: ${LANGUAGE_NAMES[language]}`;

  if (size === 'icon') {
    return <PopoverMenu icon="language-outline" iconSize={23} accessibilityLabel={label} items={items} style={style} />;
  }

  return (
    <PopoverMenu
      accessibilityLabel={label}
      items={items}
      matchWidth={large}
      style={[large && s.stretch, style]}
      trigger={
        <View style={[s.field, large && s.fieldLarge]}>
          {large && <Ionicons name="language-outline" size={20} color={Colors.ink} />}
          <Text style={[s.text, large && s.textLarge]}>{LANGUAGE_NAMES[language]}</Text>
          <Ionicons name="chevron-down" size={large ? 20 : 16} color={Colors.inkSoft} />
        </View>
      }
    />
  );
}

const s = StyleSheet.create({
  stretch: { alignSelf: 'stretch' },
  field: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingLeft: 8, borderRadius: 10 },
  fieldLarge: { minHeight: 52, gap: 10, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, ...inputSurface },
  text: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  textLarge: { flex: 1, fontSize: 16, fontWeight: '800' },
});
