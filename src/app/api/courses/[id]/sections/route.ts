import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getSession } from '@/lib/auth';

type Section = {
  id: string;
  course_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

// GET /api/courses/[id]/sections - List sections for a course
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

  const sections = await query<Section>(
    'SELECT * FROM sections WHERE course_id = ? ORDER BY sort_order ASC',
    [id]
  );

  return NextResponse.json({ sections });
}

// POST /api/courses/[id]/sections - Create a new section
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
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Get max sort_order for this course
    const maxOrder = await query<{ max_order: number | null }>(
      'SELECT MAX(sort_order) as max_order FROM sections WHERE course_id = ?',
      [courseId]
    );
    const sortOrder = (maxOrder[0]?.max_order ?? -1) + 1;

    await execute(
      `INSERT INTO sections (course_id, name, sort_order) VALUES (?, ?, ?)`,
      [courseId, name.trim(), sortOrder]
    );

    // Get the created section
    const sections = await query<Section>(
      'SELECT * FROM sections WHERE course_id = ? ORDER BY sort_order DESC LIMIT 1',
      [courseId]
    );

    return NextResponse.json({ section: sections[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating section:', error);
    return NextResponse.json(
      { error: 'Failed to create section' },
      { status: 500 }
    );
  }
}
