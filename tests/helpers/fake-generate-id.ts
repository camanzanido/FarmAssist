/**
 * Test double for src/database/repositories/utils.ts.
 * The real module imports 'react-native-get-random-values' as a polyfill
 * for the `uuid` package, which only works inside a React Native runtime
 * and throws when required under plain Node/Jest. Node already has a
 * built-in UUID generator, so tests don't need the polyfill at all.
 * Wired in globally via jest.config.js's moduleNameMapper.
 */
import { randomUUID } from 'crypto';

export function generateId(): string {
  return randomUUID();
}
