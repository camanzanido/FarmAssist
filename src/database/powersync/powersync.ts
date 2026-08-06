import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import { PowerSyncDatabase } from '@powersync/react-native';
import { AppSchema } from '../schema';

const factory = new OPSqliteOpenFactory({
  dbFilename: 'farm_assist.db',
});

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: factory,
});