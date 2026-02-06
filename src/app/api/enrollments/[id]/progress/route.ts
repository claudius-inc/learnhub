import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getSession } from '@/lib/auth';

type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  progress_pct: number;
};

type UnitProgress = {
  id: string;
  enrollment_id: string;
  unit_id: string;
  status: string;
  score: number | null;
  time_spent_sec: number;
  completed_at: string | null;
};

// POST /api/enrollments/[id]/progress - Update unit progress
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: enrollmentId } = await params;
  const sessionId = request.cookies.get('session')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await getSession(sessionId);
  if (!currentUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Get enrollment
    const enrollment = await query<Enrollment>(
      'SELECT * FROM enrollments WHERE id = ?',
      [enrollmentId]
    );

    if (enrollment.length === 0) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Users can only update their own progress
    if (enrollment[0].user_id !== currentUser.id && currentUser.role === 'learner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { unit_id, status, score, time_spent_sec } = body;

    if (!unit_id) {
      return NextResponse.json({ error: 'unit_id is required' }, { status: 400 });
    }

    // Verify unit belongs to the course
    const unit = await query<{ id: string; course_id: string }>(
      'SELECT id, course_id FROM units WHERE id = ?',
      [unit_id]
    );

    if (unit.length === 0 || unit[0].course_id !== enrollment[0].course_id) {
      return NextResponse.json({ error: 'Unit not found in this course' }, { status: 400 });
    }

    // Check if progress record exists
    const existingProgress = await query<UnitProgress>(
      'SELECT * FROM unit_progress WHERE enrollment_id = ? AND unit_id = ?',
      [enrollmentId, unit_id]
    );

    if (existingProgress.length > 0) {
      // Update existing progress
      const updates: string[] = [];
      const args: (string | number | null)[] = [];

      if (status !== undefined) {
        updates.push('status = ?');
        args.push(status);

        if (status === 'completed' && !existingProgress[0].completed_at) {
          updates.push('completed_at = datetime("now")');
        }
      }
      if (score !== undefined) {
        updates.push('score = ?');
        args.push(score);
      }
      if (time_spent_sec !== undefined) {
        updates.push('time_spent_sec = time_spent_sec + ?');
        args.push(time_spent_sec);
      }

      if (updates.length > 0) {
        args.push(existingProgress[0].id);
        await execute(
          `UPDATE unit_progress SET ${updates.join(', ')} WHERE id = ?`,
          args
        );
      }
    } else {
      // Create new progress record
      await execute(
        `INSERT INTO unit_progress (enrollment_id, unit_id, status, score, time_spent_sec, completed_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          enrollmentId,
          unit_id,
          status || 'not_started',
          score ?? null,
          time_spent_sec ?? 0,
          status === 'completed' ? new Date().toISOString() : null,
        ]
      );
    }

    // Calculate overall progress
    const totalUnits = await query<{ count: number }>(
      'SELECT COUNT(*) as count FROM units WHERE course_id = ?',
      [enrollment[0].course_id]
    );

    const completedUnits = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM unit_progress 
       WHERE enrollment_id = ? AND status = 'completed'`,
      [enrollmentId]
    );

    const progressPct =
      totalUnits[0].count > 0
        ? Math.round((completedUnits[0].count / totalUnits[0].count) * 100)
        : 0;

    // Update enrollment status and progress
    let enrollmentStatus = enrollment[0].status;
    if (progressPct > 0 && progressPct < 100) {
      enrollmentStatus = 'in_progress';
    } else if (progressPct === 100) {
      enrollmentStatus = 'completed';
    }

    await execute(
      `UPDATE enrollments SET 
         status = ?,
         progress_pct = ?,
         started_at = COALESCE(started_at, datetime('now')),
         completed_at = CASE WHEN ? = 100 THEN datetime('now') ELSE completed_at END
       WHERE id = ?`,
      [enrollmentStatus, progressPct, progressPct, enrollmentId]
    );

    // Return updated data
    const updatedProgress = await query<UnitProgress>(
      'SELECT * FROM unit_progress WHERE enrollment_id = ? AND unit_id = ?',
      [enrollmentId, unit_id]
    );

    const updatedEnrollment = await query<Enrollment>(
      'SELECT * FROM enrollments WHERE id = ?',
      [enrollmentId]
    );

    return NextResponse.json({
      unit_progress: updatedProgress[0],
      enrollment: updatedEnrollment[0],
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}
