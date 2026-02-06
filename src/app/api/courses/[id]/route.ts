import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Course } from '../route';

type Section = {
  id: string;
  course_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

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

// GET /api/courses/[id] - Get a single course with sections and units
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

  const course = await query<Course>(
    `SELECT c.*, 
            cat.name as category_name, cat.color as category_color,
            u.name as creator_name,
            (SELECT COUNT(*) FROM sections WHERE course_id = c.id) as section_count,
            (SELECT COUNT(*) FROM units WHERE course_id = c.id) as unit_count,
            (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrollment_count
     FROM courses c
     LEFT JOIN categories cat ON c.category_id = cat.id
     LEFT JOIN users u ON c.created_by = u.id
     WHERE c.id = ?`,
    [id]
  );

  if (course.length === 0) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  // Check access for instructors
  if (currentUser.role === 'instructor' && course[0].created_by !== currentUser.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get sections and units
  const [sections, units] = await Promise.all([
    query<Section>(
      'SELECT * FROM sections WHERE course_id = ? ORDER BY sort_order ASC',
      [id]
    ),
    query<Unit>(
      'SELECT * FROM units WHERE course_id = ? ORDER BY sort_order ASC',
      [id]
    ),
  ]);

  return NextResponse.json({
    course: course[0],
    sections,
    units,
  });
}

// PUT /api/courses/[id] - Update a course
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
  if (!currentUser || currentUser.role === 'learner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Check if course exists and user has access
    const existing = await query<{ id: string; created_by: string }>(
      'SELECT id, created_by FROM courses WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Instructors can only edit their own courses
    if (currentUser.role === 'instructor' && existing[0].created_by !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

    // Build update query dynamically
    const updates: string[] = ['updated_at = datetime("now")'];
    const args: (string | number | null)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      args.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      args.push(description);
    }
    if (thumbnail_url !== undefined) {
      updates.push('thumbnail_url = ?');
      args.push(thumbnail_url);
    }
    if (category_id !== undefined) {
      updates.push('category_id = ?');
      args.push(category_id || null);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      args.push(status);
    }
    if (hidden !== undefined) {
      updates.push('hidden = ?');
      args.push(hidden ? 1 : 0);
    }
    if (time_limit_days !== undefined) {
      updates.push('time_limit_days = ?');
      args.push(time_limit_days);
    }
    if (settings_json !== undefined) {
      updates.push('settings_json = ?');
      args.push(settings_json);
    }

    args.push(id);
    await execute(
      `UPDATE courses SET ${updates.join(', ')} WHERE id = ?`,
      args
    );

    const course = await query<Course>(
      `SELECT c.*, cat.name as category_name, cat.color as category_color
       FROM courses c
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE c.id = ?`,
      [id]
    );

    return NextResponse.json({ course: course[0] });
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: 'Failed to update course' },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/[id] - Delete a course
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
  if (!currentUser || currentUser.role === 'learner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Check if course exists and user has access
    const existing = await query<{ id: string; created_by: string }>(
      'SELECT id, created_by FROM courses WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Instructors can only delete their own courses
    if (currentUser.role === 'instructor' && existing[0].created_by !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete course (cascade will handle sections, units, enrollments, etc.)
    await execute('DELETE FROM courses WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    );
  }
}
