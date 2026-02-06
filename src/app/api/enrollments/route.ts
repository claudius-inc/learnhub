import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getSession } from '@/lib/auth';

type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_pct: number;
  started_at: string | null;
  completed_at: string | null;
  enrolled_at: string;
  // Joined fields
  user_name?: string;
  user_email?: string;
  course_name?: string;
  course_thumbnail_url?: string;
  category_name?: string;
  category_color?: string;
};

// GET /api/enrollments - List enrollments
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
  const userId = searchParams.get('user_id');
  const courseId = searchParams.get('course_id');
  const status = searchParams.get('status');

  let sql = `
    SELECT e.*,
           u.name as user_name, u.email as user_email,
           c.name as course_name, c.thumbnail_url as course_thumbnail_url,
           cat.name as category_name, cat.color as category_color
    FROM enrollments e
    JOIN users u ON e.user_id = u.id
    JOIN courses c ON e.course_id = c.id
    LEFT JOIN categories cat ON c.category_id = cat.id
    WHERE 1=1
  `;
  const args: string[] = [];

  // Learners can only see their own enrollments
  if (currentUser.role === 'learner') {
    sql += ' AND e.user_id = ?';
    args.push(currentUser.id);
  } else {
    if (userId) {
      sql += ' AND e.user_id = ?';
      args.push(userId);
    }
  }

  if (courseId) {
    sql += ' AND e.course_id = ?';
    args.push(courseId);
  }

  if (status) {
    sql += ' AND e.status = ?';
    args.push(status);
  }

  sql += ' ORDER BY e.enrolled_at DESC';

  const enrollments = await query<Enrollment>(sql, args);

  return NextResponse.json({ enrollments });
}

// POST /api/enrollments - Create a new enrollment
export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('session')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await getSession(sessionId);
  if (!currentUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { user_id, course_id } = body;

    if (!course_id) {
      return NextResponse.json({ error: 'course_id is required' }, { status: 400 });
    }

    // Determine who is enrolling
    let targetUserId = user_id;

    // Learners can only enroll themselves
    if (currentUser.role === 'learner') {
      if (user_id && user_id !== currentUser.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      targetUserId = currentUser.id;
    }

    if (!targetUserId) {
      targetUserId = currentUser.id;
    }

    // Check course exists and is published (or user is admin/instructor)
    const course = await query<{ id: string; status: string; hidden: number }>(
      'SELECT id, status, hidden FROM courses WHERE id = ?',
      [course_id]
    );
    if (course.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Learners can only enroll in published, non-hidden courses
    if (currentUser.role === 'learner') {
      if (course[0].status !== 'published' || course[0].hidden === 1) {
        return NextResponse.json({ error: 'Course not available for enrollment' }, { status: 403 });
      }
    }

    // Check if already enrolled
    const existing = await query<{ id: string }>(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
      [targetUserId, course_id]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Already enrolled in this course', enrollment_id: existing[0].id },
        { status: 409 }
      );
    }

    // Create enrollment
    await execute(
      `INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)`,
      [targetUserId, course_id]
    );

    // Get the created enrollment
    const enrollment = await query<Enrollment>(
      `SELECT e.*,
              u.name as user_name, u.email as user_email,
              c.name as course_name, c.thumbnail_url as course_thumbnail_url
       FROM enrollments e
       JOIN users u ON e.user_id = u.id
       JOIN courses c ON e.course_id = c.id
       WHERE e.user_id = ? AND e.course_id = ?`,
      [targetUserId, course_id]
    );

    return NextResponse.json({ enrollment: enrollment[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating enrollment:', error);
    return NextResponse.json(
      { error: 'Failed to create enrollment' },
      { status: 500 }
    );
  }
}
