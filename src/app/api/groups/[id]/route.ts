import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { getSession } from '@/lib/auth';

type Group = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

// GET /api/groups/:id - Get a single group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = request.cookies.get('session')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await getSession(sessionId);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const group = await queryOne<Group & { user_count: number }>(
    `SELECT g.id, g.name, g.description, g.created_at,
            COUNT(u.id) as user_count
     FROM groups g
     LEFT JOIN users u ON u.group_id = g.id
     WHERE g.id = ?
     GROUP BY g.id`,
    [id]
  );

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  return NextResponse.json({ group });
}

// PUT /api/groups/:id - Update a group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    // Check if group exists
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM groups WHERE id = ?',
      [id]
    );
    if (!existing) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if name is taken by another group
    if (name) {
      const nameTaken = await query<{ id: string }>(
        'SELECT id FROM groups WHERE name = ? AND id != ?',
        [name, id]
      );
      if (nameTaken.length > 0) {
        return NextResponse.json(
          { error: 'Group name already exists' },
          { status: 400 }
        );
      }
    }

    // Build update query
    const updates: string[] = [];
    const args: (string | null)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      args.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      args.push(description || null);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    args.push(id);
    await execute(
      `UPDATE groups SET ${updates.join(', ')} WHERE id = ?`,
      args
    );

    const group = await queryOne<Group>(
      'SELECT id, name, description, created_at FROM groups WHERE id = ?',
      [id]
    );

    return NextResponse.json({ group });
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json(
      { error: 'Failed to update group' },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/:id - Delete a group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = request.cookies.get('session')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await getSession(sessionId);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM groups WHERE id = ?',
    [id]
  );
  if (!existing) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  // Remove group_id from users in this group
  await execute('UPDATE users SET group_id = NULL WHERE group_id = ?', [id]);
  
  // Delete the group
  await execute('DELETE FROM groups WHERE id = ?', [id]);

  return NextResponse.json({ success: true });
}
