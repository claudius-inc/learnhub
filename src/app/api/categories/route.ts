import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export type Category = {
  id: string;
  name: string;
  slug: string;
  color: string;
  sort_order: number;
  created_at: string;
  course_count?: number;
};

// GET /api/categories - List all categories
export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await getSession(sessionId);
  if (!currentUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';

  let sql = `
    SELECT c.id, c.name, c.slug, c.color, c.sort_order, c.created_at,
           COUNT(co.id) as course_count
    FROM categories c
    LEFT JOIN courses co ON co.category_id = c.id
  `;
  const args: string[] = [];

  if (search) {
    sql += ` WHERE c.name LIKE ?`;
    args.push(`%${search}%`);
  }

  sql += ` GROUP BY c.id ORDER BY c.sort_order ASC, c.name ASC`;

  const categories = await query<Category>(sql, args);

  return NextResponse.json({ categories });
}

// POST /api/categories - Create a new category
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
    const { name, color, sort_order } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug already exists
    const existing = await query<{ id: string }>(
      'SELECT id FROM categories WHERE slug = ?',
      [slug]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Category slug already exists' },
        { status: 400 }
      );
    }

    const id = uuidv4().replace(/-/g, '');

    await execute(
      'INSERT INTO categories (id, name, slug, color, sort_order) VALUES (?, ?, ?, ?, ?)',
      [id, name, slug, color || '#6366f1', sort_order ?? 0]
    );

    const category = await query<Category>(
      'SELECT id, name, slug, color, sort_order, created_at FROM categories WHERE id = ?',
      [id]
    );

    return NextResponse.json({ category: category[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
