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

// GET /api/courses/[id]/units/[unitId] - Get a single unit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  const { id: courseId, unitId } = await params;
  const sessionId = request.cookies.get('session')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await getSession(sessionId);
  if (!currentUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const unit = await query<Unit>(
    'SELECT * FROM units WHERE id = ? AND course_id = ?',
    [unitId, courseId]
  );

  if (unit.length === 0) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
  }

  return NextResponse.json({ unit: unit[0] });
}

// PUT /api/courses/[id]/units/[unitId] - Update a unit
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  const { id: courseId, unitId } = await params;
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

    // Check unit exists
    const existing = await query<Unit>(
      'SELECT * FROM units WHERE id = ? AND course_id = ?',
      [unitId, courseId]
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, type, section_id, content, settings_json, sort_order } = body;

    const updates: string[] = ['updated_at = datetime("now")'];
    const args: (string | number | null)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      args.push(name.trim());
    }
    if (type !== undefined) {
      if (!VALID_TYPES.includes(type)) {
        return NextResponse.json(
          { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
          { status: 400 }
        );
      }
      updates.push('type = ?');
      args.push(type);
    }
    if (section_id !== undefined) {
      // Verify section belongs to this course if provided
      if (section_id !== null) {
        const section = await query<{ id: string }>(
          'SELECT id FROM sections WHERE id = ? AND course_id = ?',
          [section_id, courseId]
        );
        if (section.length === 0) {
          return NextResponse.json({ error: 'Section not found' }, { status: 400 });
        }
      }
      updates.push('section_id = ?');
      args.push(section_id);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      args.push(content);
    }
    if (settings_json !== undefined) {
      updates.push('settings_json = ?');
      args.push(typeof settings_json === 'string' ? settings_json : JSON.stringify(settings_json));
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      args.push(sort_order);
    }

    args.push(unitId);
    await execute(
      `UPDATE units SET ${updates.join(', ')} WHERE id = ?`,
      args
    );

    const unit = await query<Unit>(
      'SELECT * FROM units WHERE id = ?',
      [unitId]
    );

    return NextResponse.json({ unit: unit[0] });
  } catch (error) {
    console.error('Error updating unit:', error);
    return NextResponse.json(
      { error: 'Failed to update unit' },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/[id]/units/[unitId] - Delete a unit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  const { id: courseId, unitId } = await params;
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

    // Check unit exists
    const existing = await query<Unit>(
      'SELECT * FROM units WHERE id = ? AND course_id = ?',
      [unitId, courseId]
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    // Delete the unit (CASCADE will handle unit_progress, quiz_attempts, etc.)
    await execute('DELETE FROM units WHERE id = ?', [unitId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting unit:', error);
    return NextResponse.json(
      { error: 'Failed to delete unit' },
      { status: 500 }
    );
  }
}
