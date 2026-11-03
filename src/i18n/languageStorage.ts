import AsyncStorage from '@react-native-async-storage/async-storage';
import { isLanguage, type Language } from './dictionary';

export const LANGUAGE_STORAGE_KEY = 'language.v1';

// No saved choice, or a storage fault, falls back to English: the app's language before this setting existed.
export async function loadLanguage(): Promise<Language> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(saved) ? saved : 'en';
  } catch (err) {
    console.warn('Could not read language setting:', err);
    return 'en';
  }
}

export async function saveLanguage(language: Language): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (err) {
    console.warn('Could not save language setting:', err);
  }
}
