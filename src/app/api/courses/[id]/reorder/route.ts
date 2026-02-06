import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getSession } from '@/lib/auth';

// POST /api/courses/[id]/reorder - Reorder sections or units
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
    const { type, items } = body;

    if (!type || !['sections', 'units'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "sections" or "units"' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items must be an array of { id, sort_order, section_id? }' },
        { status: 400 }
      );
    }

    const table = type === 'sections' ? 'sections' : 'units';

    // Update each item's sort_order (and section_id for units)
    for (const item of items) {
      if (!item.id || typeof item.sort_order !== 'number') continue;

      if (type === 'units' && 'section_id' in item) {
        // Move unit to different section
        await execute(
          `UPDATE ${table} SET sort_order = ?, section_id = ? WHERE id = ? AND course_id = ?`,
          [item.sort_order, item.section_id ?? null, item.id, courseId]
        );
      } else {
        await execute(
          `UPDATE ${table} SET sort_order = ? WHERE id = ? AND course_id = ?`,
          [item.sort_order, item.id, courseId]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering:', error);
    return NextResponse.json(
      { error: 'Failed to reorder' },
      { status: 500 }
    );
  }
}
