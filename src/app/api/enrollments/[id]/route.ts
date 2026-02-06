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
  user_name?: string;
  user_email?: string;
  course_name?: string;
};

// GET /api/enrollments/[id] - Get a single enrollment with progress
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

  const enrollment = await query<Enrollment>(
    `SELECT e.*,
            u.name as user_name, u.email as user_email,
            c.name as course_name
     FROM enrollments e
     JOIN users u ON e.user_id = u.id
     JOIN courses c ON e.course_id = c.id
     WHERE e.id = ?`,
    [id]
  );

  if (enrollment.length === 0) {
    return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
  }

  // Learners can only view their own enrollments
  if (currentUser.role === 'learner' && enrollment[0].user_id !== currentUser.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get unit progress
  const unitProgress = await query<{
    unit_id: string;
    status: string;
    score: number | null;
    time_spent_sec: number;
    completed_at: string | null;
  }>(
    'SELECT unit_id, status, score, time_spent_sec, completed_at FROM unit_progress WHERE enrollment_id = ?',
    [id]
  );

  return NextResponse.json({
    enrollment: enrollment[0],
    unit_progress: unitProgress,
  });
}

// PUT /api/enrollments/[id] - Update enrollment status/progress
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
  if (!currentUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const enrollment = await query<Enrollment>(
      'SELECT * FROM enrollments WHERE id = ?',
      [id]
    );

    if (enrollment.length === 0) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Learners can only update their own enrollments
    if (currentUser.role === 'learner' && enrollment[0].user_id !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status, progress_pct } = body;

    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (status !== undefined && ['not_started', 'in_progress', 'completed'].includes(status)) {
      updates.push('status = ?');
      args.push(status);

      if (status === 'in_progress' && !enrollment[0].started_at) {
        updates.push('started_at = datetime("now")');
      }
      if (status === 'completed' && !enrollment[0].completed_at) {
        updates.push('completed_at = datetime("now")');
      }
    }

    if (progress_pct !== undefined && typeof progress_pct === 'number') {
      updates.push('progress_pct = ?');
      args.push(Math.min(100, Math.max(0, progress_pct)));
    }

    if (updates.length === 0) {
      return NextResponse.json({ enrollment: enrollment[0] });
    }

    args.push(id);
    await execute(
      `UPDATE enrollments SET ${updates.join(', ')} WHERE id = ?`,
      args
    );

    const updated = await query<Enrollment>(
      'SELECT * FROM enrollments WHERE id = ?',
      [id]
    );

    return NextResponse.json({ enrollment: updated[0] });
  } catch (error) {
    console.error('Error updating enrollment:', error);
    return NextResponse.json(
      { error: 'Failed to update enrollment' },
      { status: 500 }
    );
  }
}

// DELETE /api/enrollments/[id] - Unenroll
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
  if (!currentUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const enrollment = await query<Enrollment>(
      'SELECT * FROM enrollments WHERE id = ?',
      [id]
    );

    if (enrollment.length === 0) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Learners can only delete their own enrollments
    // Instructors can delete enrollments for courses they created
    // Admins can delete any enrollment
    if (currentUser.role === 'learner' && enrollment[0].user_id !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete enrollment (CASCADE will handle unit_progress)
    await execute('DELETE FROM enrollments WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    return NextResponse.json(
      { error: 'Failed to delete enrollment' },
      { status: 500 }
    );
  }
}
