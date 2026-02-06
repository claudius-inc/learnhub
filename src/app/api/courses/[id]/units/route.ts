import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getSession } from '@/lib/auth';

type Unit = {
  id: string;
  course_id: string;
  section_id: string | null;
  type: 'text' | 'video' | 'document' | 'quiz' | 'survey' | 'link';
  name: string;
  content: string | null;
  settings_json: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const VALID_TYPES = ['text', 'video', 'document', 'quiz', 'survey', 'link'];

// GET /api/courses/[id]/units - List units for a course
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

  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get('section_id');

  let sql = 'SELECT * FROM units WHERE course_id = ?';
  const args: (string | null)[] = [id];

  if (sectionId) {
    sql += sectionId === 'null' ? ' AND section_id IS NULL' : ' AND section_id = ?';
    if (sectionId !== 'null') args.push(sectionId);
  }

  sql += ' ORDER BY sort_order ASC';

  const units = await query<Unit>(sql, args);

  return NextResponse.json({ units });
}

// POST /api/courses/[id]/units - Create a new unit
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;
  const sessionId = request.cookies.get('session')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await getSession(sessionId);
  if (!currentUser || currentUser.role === 'learner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Check course exists and user has access
    const course = await query<{ id: string; created_by: string }>(
      'SELECT id, created_by FROM courses WHERE id = ?',
      [courseId]
    );
    if (course.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (currentUser.role === 'instructor' && course[0].created_by !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, type, section_id, content, settings_json } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify section belongs to this course if provided
    if (section_id) {
      const section = await query<{ id: string }>(
        'SELECT id FROM sections WHERE id = ? AND course_id = ?',
        [section_id, courseId]
      );
      if (section.length === 0) {
        return NextResponse.json({ error: 'Section not found' }, { status: 400 });
      }
    }

    // Get max sort_order for this section (or unsectioned)
    const maxOrderSql = section_id
      ? 'SELECT MAX(sort_order) as max_order FROM units WHERE course_id = ? AND section_id = ?'
      : 'SELECT MAX(sort_order) as max_order FROM units WHERE course_id = ? AND section_id IS NULL';
    const maxOrderArgs = section_id ? [courseId, section_id] : [courseId];
    const maxOrder = await query<{ max_order: number | null }>(maxOrderSql, maxOrderArgs);
    const sortOrder = (maxOrder[0]?.max_order ?? -1) + 1;

    await execute(
      `INSERT INTO units (course_id, section_id, type, name, content, settings_json, sort_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        courseId,
        section_id || null,
        type,
        name.trim(),
        content || null,
        settings_json || '{}',
        sortOrder,
      ]
    );

    // Get the created unit
    const units = await query<Unit>(
      'SELECT * FROM units WHERE course_id = ? ORDER BY created_at DESC LIMIT 1',
      [courseId]
    );

    return NextResponse.json({ unit: units[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating unit:', error);
    return NextResponse.json(
      { error: 'Failed to create unit' },
      { status: 500 }
    );
  }
}
