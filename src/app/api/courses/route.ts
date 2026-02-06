import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export type Course = {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  category_id: string | null;
  status: 'draft' | 'published' | 'archived';
  hidden: number;
  time_limit_days: number | null;
  settings_json: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category_name?: string | null;
  category_color?: string | null;
  creator_name?: string | null;
  section_count?: number;
  unit_count?: number;
  enrollment_count?: number;
};

// GET /api/courses - List courses with filters
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
  const categoryId = searchParams.get('category_id') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let sql = `
    SELECT c.id, c.name, c.description, c.thumbnail_url, c.category_id, 
           c.status, c.hidden, c.time_limit_days, c.settings_json,
           c.created_by, c.created_at, c.updated_at,
           cat.name as category_name, cat.color as category_color,
           u.name as creator_name,
           (SELECT COUNT(*) FROM sections WHERE course_id = c.id) as section_count,
           (SELECT COUNT(*) FROM units WHERE course_id = c.id) as unit_count,
           (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrollment_count
    FROM courses c
    LEFT JOIN categories cat ON c.category_id = cat.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE 1=1
  `;
  let countSql = 'SELECT COUNT(*) as total FROM courses c WHERE 1=1';
  const args: (string | number)[] = [];
  const countArgs: (string | number)[] = [];

  // Only show courses based on role
  if (currentUser.role === 'instructor') {
    sql += ` AND c.created_by = ?`;
    countSql += ` AND c.created_by = ?`;
    args.push(currentUser.id);
    countArgs.push(currentUser.id);
  }

  if (search) {
    sql += ` AND (c.name LIKE ? OR c.description LIKE ?)`;
    countSql += ` AND (c.name LIKE ? OR c.description LIKE ?)`;
    args.push(`%${search}%`, `%${search}%`);
    countArgs.push(`%${search}%`, `%${search}%`);
  }

  if (categoryId) {
    sql += ` AND c.category_id = ?`;
    countSql += ` AND c.category_id = ?`;
    args.push(categoryId);
    countArgs.push(categoryId);
  }

  if (status) {
    sql += ` AND c.status = ?`;
    countSql += ` AND c.status = ?`;
    args.push(status);
    countArgs.push(status);
  }

  sql += ` ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`;
  args.push(limit, offset);

  const [courses, countResult] = await Promise.all([
    query<Course>(sql, args),
    query<{ total: number }>(countSql, countArgs),
  ]);

  const total = countResult[0]?.total || 0;

  return NextResponse.json({
    courses,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// POST /api/courses - Create a new course
export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('session')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await getSession(sessionId);
  if (!currentUser || currentUser.role === 'learner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      thumbnail_url, 
      category_id, 
      status,
      hidden,
      time_limit_days,
      settings_json 
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Course name is required' },
        { status: 400 }
      );
    }

    const id = uuidv4().replace(/-/g, '');

    await execute(
      `INSERT INTO courses (id, name, description, thumbnail_url, category_id, 
                            status, hidden, time_limit_days, settings_json, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        description || null,
        thumbnail_url || null,
        category_id || null,
        status || 'draft',
        hidden ? 1 : 0,
        time_limit_days || null,
        settings_json || '{}',
        currentUser.id,
      ]
    );

    const course = await query<Course>(
      `SELECT c.*, cat.name as category_name, cat.color as category_color
       FROM courses c
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE c.id = ?`,
      [id]
    );

    return NextResponse.json({ course: course[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
}
