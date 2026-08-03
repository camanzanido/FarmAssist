// db/utils.ts
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}