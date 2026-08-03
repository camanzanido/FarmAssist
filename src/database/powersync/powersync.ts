import { SQLJSOpenFactory } from '@powersync/adapter-sql-js';
import { PowerSyncDatabase } from '@powersync/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { AppSchema } from '../schema';

const sqljs = new SQLJSOpenFactory({
  dbFilename: 'farm_assist.db',
  persister: {
    readFile: async () => {
      try {
        const path = `${FileSystem.documentDirectory}farm_assist.db`;
        const info = await FileSystem.getInfoAsync(path);
        if (!info.exists) return null;
        const result = await FileSystem.readAsStringAsync(path, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const binary = atob(result);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      } catch {
        return null;
      }
    },
    writeFile: async (data: ArrayLike<number>) => {
      const path = `${FileSystem.documentDirectory}farm_assist.db`;
      const uint8Array = new Uint8Array(data);
      const binary = Array.from(uint8Array, b => String.fromCharCode(b)).join('');
      const base64 = btoa(binary);
      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    },
  },
});

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: sqljs,
});