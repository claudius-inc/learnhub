import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export type Group = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  user_count?: number;
};

// GET /api/groups - List all groups
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

  let sql = `
    SELECT g.id, g.name, g.description, g.created_at,
           COUNT(u.id) as user_count
    FROM groups g
    LEFT JOIN users u ON u.group_id = g.id
  `;
  const args: string[] = [];

  if (search) {
    sql += ` WHERE g.name LIKE ?`;
    args.push(`%${search}%`);
  }

  sql += ` GROUP BY g.id ORDER BY g.name ASC`;

  const groups = await query<Group>(sql, args);

  return NextResponse.json({ groups });
}

// POST /api/groups - Create a new group
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
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Check if name already exists
    const existing = await query<{ id: string }>(
      'SELECT id FROM groups WHERE name = ?',
      [name]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Group name already exists' },
        { status: 400 }
      );
    }

    const id = uuidv4().replace(/-/g, '');

    await execute(
      'INSERT INTO groups (id, name, description) VALUES (?, ?, ?)',
      [id, name, description || null]
    );

    const group = await query<Group>(
      'SELECT id, name, description, created_at FROM groups WHERE id = ?',
      [id]
    );

    return NextResponse.json({ group: group[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    );
  }
}
