import AsyncStorage from '@react-native-async-storage/async-storage';

// Bump the version suffix to show the intro again after a major redesign.
export const ONBOARDING_STORAGE_KEY = 'onboarding.v1';
const DONE = 'done';

// A failed read counts as seen, so a storage fault never traps users in the intro on every launch.
export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)) === DONE;
  } catch (err) {
    console.warn('Could not read onboarding flag:', err);
    return true;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, DONE);
  } catch (err) {
    console.warn('Could not save onboarding flag:', err);
  }
}
