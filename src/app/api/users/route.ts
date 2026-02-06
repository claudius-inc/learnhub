import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getSession, hashPassword, User } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// GET /api/users - List users with filters
export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await getSession(sessionId);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const status = searchParams.get('status') || '';
  const groupId = searchParams.get('group_id') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let sql = `
    SELECT u.id, u.email, u.name, u.avatar_url, u.role, u.group_id, u.status, 
           u.last_login_at, u.created_at, g.name as group_name
    FROM users u
    LEFT JOIN groups g ON u.group_id = g.id
    WHERE 1=1
  `;
  let countSql = 'SELECT COUNT(*) as total FROM users u WHERE 1=1';
  const args: (string | number)[] = [];
  const countArgs: (string | number)[] = [];

  if (search) {
    sql += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
    countSql += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
    args.push(`%${search}%`, `%${search}%`);
    countArgs.push(`%${search}%`, `%${search}%`);
  }

  if (role) {
    sql += ` AND u.role = ?`;
    countSql += ` AND u.role = ?`;
    args.push(role);
    countArgs.push(role);
  }

  if (status) {
    sql += ` AND u.status = ?`;
    countSql += ` AND u.status = ?`;
    args.push(status);
    countArgs.push(status);
  }

  if (groupId) {
    sql += ` AND u.group_id = ?`;
    countSql += ` AND u.group_id = ?`;
    args.push(groupId);
    countArgs.push(groupId);
  }

  sql += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
  args.push(limit, offset);

  const [users, countResult] = await Promise.all([
    query<User & { group_name: string | null }>(sql, args),
    query<{ total: number }>(countSql, countArgs),
  ]);

  const total = countResult[0]?.total || 0;

  return NextResponse.json({
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('session')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await getSession(sessionId);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, name, password, role, group_id, status } = body;

    // Validation
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await query<{ id: string }>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    const id = uuidv4().replace(/-/g, '');
    const passwordHash = await hashPassword(password);

    await execute(
      `INSERT INTO users (id, email, name, password_hash, role, group_id, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        email,
        name,
        passwordHash,
        role || 'learner',
        group_id || null,
        status || 'active',
      ]
    );

    const user = await query<User>(
      `SELECT id, email, name, avatar_url, role, group_id, status, last_login_at, created_at 
       FROM users WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ user: user[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
