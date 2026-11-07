import { MAX_FONT_SCALE } from '@/src/utils/fontScale';
import React from 'react';
// eslint-disable-next-line no-restricted-imports
import { Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from 'react-native';

// React 19 ignores defaultProps on function components, so every text in the app comes through here to get the size cap.
export const Text = React.forwardRef<RNText, TextProps>(function Text(props, ref) {
  return <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} ref={ref} />;
});

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(function TextInput(props, ref) {
  return <RNTextInput maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} ref={ref} />;
});

