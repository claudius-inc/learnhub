import { compare, hash } from 'bcryptjs';
import { query, queryOne, execute } from './db';
import { v4 as uuidv4 } from 'uuid';

export type User = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: 'admin' | 'instructor' | 'learner';
  group_id: string | null;
  status: 'active' | 'inactive' | 'suspended';
  last_login_at: string | null;
  created_at: string;
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return queryOne<User>(
    `SELECT id, email, name, avatar_url, role, group_id, status, last_login_at, created_at 
     FROM users WHERE email = ?`,
    [email]
  );
}

export async function getUserById(id: string): Promise<User | null> {
  return queryOne<User>(
    `SELECT id, email, name, avatar_url, role, group_id, status, last_login_at, created_at 
     FROM users WHERE id = ?`,
    [id]
  );
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const row = await queryOne<{ id: string; password_hash: string }>(
    'SELECT id, password_hash FROM users WHERE email = ? AND status = ?',
    [email, 'active']
  );
  
  if (!row || !row.password_hash) return null;
  
  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) return null;
  
  // Update last login
  await execute('UPDATE users SET last_login_at = datetime("now") WHERE id = ?', [row.id]);
  
  return getUserById(row.id);
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  
  await execute(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
    [sessionId, userId, expiresAt]
  );
  
  return sessionId;
}

export async function getSession(sessionId: string): Promise<User | null> {
  const row = await queryOne<{ user_id: string; expires_at: string }>(
    'SELECT user_id, expires_at FROM sessions WHERE id = ?',
    [sessionId]
  );
  
  if (!row) return null;
  
  // Check if expired
  if (new Date(row.expires_at) < new Date()) {
    await execute('DELETE FROM sessions WHERE id = ?', [sessionId]);
    return null;
  }
  
  return getUserById(row.user_id);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await execute('DELETE FROM sessions WHERE id = ?', [sessionId]);
}

export async function createUser(data: {
  email: string;
  name: string;
  password: string;
  role?: 'admin' | 'instructor' | 'learner';
  group_id?: string;
}): Promise<User> {
  const id = uuidv4().replace(/-/g, '');
  const passwordHash = await hashPassword(data.password);
  
  await execute(
    `INSERT INTO users (id, email, name, password_hash, role, group_id) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.email, data.name, passwordHash, data.role ?? 'learner', data.group_id ?? null]
  );
  
  return getUserById(id) as Promise<User>;
}
