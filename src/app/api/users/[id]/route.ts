import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { getSession, hashPassword, User } from '@/lib/auth';

// GET /api/users/:id - Get a single user
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
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Users can view their own profile, admins can view anyone
  if (currentUser.id !== id && currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const user = await queryOne<User & { group_name: string | null }>(
    `SELECT u.id, u.email, u.name, u.avatar_url, u.role, u.group_id, u.status, 
            u.last_login_at, u.created_at, g.name as group_name
     FROM users u
     LEFT JOIN groups g ON u.group_id = g.id
     WHERE u.id = ?`,
    [id]
  );

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

// PUT /api/users/:id - Update a user
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
    const { email, name, password, role, group_id, status } = body;

    // Check if user exists
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if email is taken by another user
    if (email) {
      const emailTaken = await query<{ id: string }>(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );
      if (emailTaken.length > 0) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const args: (string | null)[] = [];

    if (email !== undefined) {
      updates.push('email = ?');
      args.push(email);
    }
    if (name !== undefined) {
      updates.push('name = ?');
      args.push(name);
    }
    if (password) {
      updates.push('password_hash = ?');
      args.push(await hashPassword(password));
    }
    if (role !== undefined) {
      updates.push('role = ?');
      args.push(role);
    }
    if (group_id !== undefined) {
      updates.push('group_id = ?');
      args.push(group_id || null);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      args.push(status);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    args.push(id);
    await execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      args
    );

    const user = await queryOne<User>(
      `SELECT id, email, name, avatar_url, role, group_id, status, last_login_at, created_at 
       FROM users WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/:id - Delete a user
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

  // Prevent self-deletion
  if (currentUser.id === id) {
    return NextResponse.json(
      { error: 'Cannot delete your own account' },
      { status: 400 }
    );
  }

  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE id = ?',
    [id]
  );
  if (!existing) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Delete user sessions first
  await execute('DELETE FROM sessions WHERE user_id = ?', [id]);
  
  // Delete user
  await execute('DELETE FROM users WHERE id = ?', [id]);

  return NextResponse.json({ success: true });
}
