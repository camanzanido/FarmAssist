// db/users.ts
import { db } from '../powersync/powersync';
import { getCurrentUser } from '../supabase/supabase';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  status: string;
  created_at: string;
  user_type: string;
}

export async function getUser(userId: string): Promise<User | null> {
  const result = await db.getOptional<User>(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );
  return result ?? null;
}

export async function getCurrentUserProfile(): Promise<User | null> {
  const authUser = await getCurrentUser();
  if (!authUser) return null;
  return getUser(authUser.id);
}

export async function getAllUsers(): Promise<User[]> {
  return db.getAll<User>('SELECT * FROM users ORDER BY created_at DESC');
}

export async function upsertUser(user: Omit<User, 'created_at'>): Promise<void> {
  await db.writeTransaction(async (tx) => {
    const existing = await tx.getOptional<{ id: string }>(
      'SELECT id FROM users WHERE id = ?',
      [user.id]
    );

    if (existing) {
      await tx.execute(
        `UPDATE users SET name = ?, username = ?, email = ?, status = ?, user_type = ? WHERE id = ?`,
        [user.name, user.username, user.email, user.status, user.user_type, user.id]
      );
    } else {
      await tx.execute(
        `INSERT INTO users (id, name, username, email, status, created_at, user_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.name,
          user.username,
          user.email,
          user.status,
          new Date().toISOString(),
          user.user_type,
        ]
      );
    }
  });
}

export async function updateUser(
  userId: string,
  fields: Partial<Pick<User, 'name' | 'username' | 'email' | 'status' | 'user_type'>>
): Promise<void> {
  const entries = Object.entries(fields);
  if (entries.length === 0) return;

  const setClauses = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([, val]) => val);

  await db.execute(
    `UPDATE users SET ${setClauses} WHERE id = ?`,
    [...values, userId]
  );
}