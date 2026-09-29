const store = new Map<string, string>();
const storage = {
  getItem: jest.fn(async (k: string) => store.get(k) ?? null),
  setItem: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
};
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: storage }));

import { hasSeenOnboarding, markOnboardingSeen, ONBOARDING_STORAGE_KEY } from '../../src/onboarding/onboardingStorage';

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('a fresh install has not seen onboarding', async () => {
  expect(await hasSeenOnboarding()).toBe(false);
});

test('marking it seen persists across reads', async () => {
  await markOnboardingSeen();
  expect(store.get(ONBOARDING_STORAGE_KEY)).toBe('done');
  expect(await hasSeenOnboarding()).toBe(true);
});

test('an unexpected stored value does not count as seen', async () => {
  store.set(ONBOARDING_STORAGE_KEY, 'true');
  expect(await hasSeenOnboarding()).toBe(false);
});

test('a failed read counts as seen so users are never stuck in the intro', async () => {
  storage.getItem.mockRejectedValueOnce(new Error('disk'));
  expect(await hasSeenOnboarding()).toBe(true);
});

test('a failed write does not throw', async () => {
  storage.setItem.mockRejectedValueOnce(new Error('disk'));
  await expect(markOnboardingSeen()).resolves.toBeUndefined();
});
