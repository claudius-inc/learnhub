import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Category } from '../route';

// GET /api/categories/[id] - Get a single category
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
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const category = await query<Category>(
    `SELECT c.id, c.name, c.slug, c.color, c.sort_order, c.created_at,
            COUNT(co.id) as course_count
     FROM categories c
     LEFT JOIN courses co ON co.category_id = c.id
     WHERE c.id = ?
     GROUP BY c.id`,
    [id]
  );

  if (category.length === 0) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  return NextResponse.json({ category: category[0] });
}

// PUT /api/categories/[id] - Update a category
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
    const { name, color, sort_order } = body;

    // Check if category exists
    const existing = await query<{ id: string }>(
      'SELECT id FROM categories WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      args.push(name);

      // Update slug too
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if new slug conflicts with another category
      const slugConflict = await query<{ id: string }>(
        'SELECT id FROM categories WHERE slug = ? AND id != ?',
        [slug, id]
      );
      if (slugConflict.length > 0) {
        return NextResponse.json(
          { error: 'Category slug already exists' },
          { status: 400 }
        );
      }

      updates.push('slug = ?');
      args.push(slug);
    }

    if (color !== undefined) {
      updates.push('color = ?');
      args.push(color);
    }

    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      args.push(sort_order);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    args.push(id);
    await execute(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
      args
    );

    const category = await query<Category>(
      'SELECT id, name, slug, color, sort_order, created_at FROM categories WHERE id = ?',
      [id]
    );

    return NextResponse.json({ category: category[0] });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - Delete a category
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

  try {
    // Check if category exists
    const existing = await query<{ id: string }>(
      'SELECT id FROM categories WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Delete category (courses will have category_id set to NULL due to ON DELETE SET NULL)
    await execute('DELETE FROM categories WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
