// db/locations.ts
import { db } from '../powersync/powersync';
import { generateId } from './utils';

export interface Location {
  id: string;
  city: string;
  province: string;
  user_id: string;
}

export async function getLocationsByUser(userId: string): Promise<Location[]> {
  return db.getAll<Location>(
    'SELECT * FROM locations WHERE user_id = ? ORDER BY city ASC',
    [userId]
  );
}

export async function getAllLocations(): Promise<Location[]> {
  return db.getAll<Location>('SELECT * FROM locations ORDER BY city ASC');
}

export async function getLocation(locationId: string): Promise<Location | null> {
  const result = await db.getOptional<Location>(
    'SELECT * FROM locations WHERE id = ?',
    [locationId]
  );
  return result ?? null;
}

export async function createLocation(
  data: Omit<Location, 'id'>
): Promise<string> {
  const id = generateId();
  await db.execute(
    'INSERT INTO locations (id, city, province, user_id) VALUES (?, ?, ?, ?)',
    [id, data.city, data.province, data.user_id]
  );
  return id;
}

export async function updateLocation(
  locationId: string,
  fields: Partial<Pick<Location, 'city' | 'province'>>
): Promise<void> {
  const entries = Object.entries(fields);
  if (entries.length === 0) return;

  const setClauses = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([, val]) => val);

  await db.execute(
    `UPDATE locations SET ${setClauses} WHERE id = ?`,
    [...values, locationId]
  );
}

export async function deleteLocation(locationId: string): Promise<void> {
  await db.execute('DELETE FROM locations WHERE id = ?', [locationId]);
}