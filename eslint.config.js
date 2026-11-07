// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'supabase/functions/**'],
  },
  {
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'react-native',
          importNames: ['Text', 'TextInput'],
          message: "Import Text and TextInput from '@/src/components/ui/text' so they get the font size cap.",
        }],
      }],
    },
  },
]);
