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

// PUT /api/courses/[id]/sections/[sectionId] - Update a section
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { id: courseId, sectionId } = await params;
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

    // Check section exists
    const existing = await query<Section>(
      'SELECT * FROM sections WHERE id = ? AND course_id = ?',
      [sectionId, courseId]
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, sort_order } = body;

    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      args.push(name.trim());
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      args.push(sort_order);
    }

    if (updates.length === 0) {
      return NextResponse.json({ section: existing[0] });
    }

    args.push(sectionId);
    await execute(
      `UPDATE sections SET ${updates.join(', ')} WHERE id = ?`,
      args
    );

    const section = await query<Section>(
      'SELECT * FROM sections WHERE id = ?',
      [sectionId]
    );

    return NextResponse.json({ section: section[0] });
  } catch (error) {
    console.error('Error updating section:', error);
    return NextResponse.json(
      { error: 'Failed to update section' },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/[id]/sections/[sectionId] - Delete a section
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { id: courseId, sectionId } = await params;
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

    // Check section exists
    const existing = await query<Section>(
      'SELECT * FROM sections WHERE id = ? AND course_id = ?',
      [sectionId, courseId]
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    // Set units in this section to unsectioned (null section_id)
    await execute(
      'UPDATE units SET section_id = NULL WHERE section_id = ?',
      [sectionId]
    );

    // Delete the section
    await execute('DELETE FROM sections WHERE id = ?', [sectionId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting section:', error);
    return NextResponse.json(
      { error: 'Failed to delete section' },
      { status: 500 }
    );
  }
}
