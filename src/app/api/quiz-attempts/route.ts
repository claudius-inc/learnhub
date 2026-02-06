import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getSession } from '@/lib/auth';

export type QuizAttempt = {
  id: string;
  enrollment_id: string;
  unit_id: string;
  score: number | null;
  passed: number | null;
  started_at: string;
  completed_at: string | null;
  // Joined fields
  unit_name?: string;
  course_name?: string;
  total_questions?: number;
  correct_answers?: number;
};

// GET /api/quiz-attempts - List quiz attempts
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
  const enrollmentId = searchParams.get('enrollment_id');
  const unitId = searchParams.get('unit_id');

  let sql = `
    SELECT qa.*,
           u.name as unit_name,
           c.name as course_name,
           (SELECT COUNT(*) FROM quiz_answers WHERE attempt_id = qa.id) as total_questions,
           (SELECT COUNT(*) FROM quiz_answers WHERE attempt_id = qa.id AND is_correct = 1) as correct_answers
    FROM quiz_attempts qa
    JOIN units u ON qa.unit_id = u.id
    JOIN courses c ON u.course_id = c.id
    JOIN enrollments e ON qa.enrollment_id = e.id
    WHERE 1=1
  `;
  const args: string[] = [];

  // Learners can only see their own attempts
  if (currentUser.role === 'learner') {
    sql += ' AND e.user_id = ?';
    args.push(currentUser.id);
  }

  if (enrollmentId) {
    sql += ' AND qa.enrollment_id = ?';
    args.push(enrollmentId);
  }

  if (unitId) {
    sql += ' AND qa.unit_id = ?';
    args.push(unitId);
  }

  sql += ' ORDER BY qa.started_at DESC';

  const attempts = await query<QuizAttempt>(sql, args);

  return NextResponse.json({ attempts });
}

// POST /api/quiz-attempts - Start a new quiz attempt
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
    const { unit_id } = body;

    if (!unit_id) {
      return NextResponse.json({ error: 'unit_id is required' }, { status: 400 });
    }

    // Get unit and verify it's a quiz
    const unit = await query<{ id: string; course_id: string; type: string; settings_json: string }>(
      'SELECT id, course_id, type, settings_json FROM units WHERE id = ?',
      [unit_id]
    );

    if (unit.length === 0) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    if (unit[0].type !== 'quiz') {
      return NextResponse.json({ error: 'Unit is not a quiz' }, { status: 400 });
    }

    // Get enrollment
    const enrollment = await query<{ id: string; user_id: string }>(
      'SELECT id, user_id FROM enrollments WHERE user_id = ? AND course_id = ?',
      [currentUser.id, unit[0].course_id]
    );

    if (enrollment.length === 0) {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 });
    }

    // Parse quiz settings
    const settings = JSON.parse(unit[0].settings_json || '{}');
    const maxRetries = settings.max_retries ?? -1; // -1 = unlimited

    // Check retry limit
    if (maxRetries >= 0) {
      const existingAttempts = await query<{ count: number }>(
        'SELECT COUNT(*) as count FROM quiz_attempts WHERE enrollment_id = ? AND unit_id = ? AND completed_at IS NOT NULL',
        [enrollment[0].id, unit_id]
      );

      if (existingAttempts[0].count >= maxRetries) {
        return NextResponse.json(
          { error: 'Maximum retry limit reached' },
          { status: 400 }
        );
      }
    }

    // Check for incomplete attempt
    const incompleteAttempt = await query<QuizAttempt>(
      'SELECT * FROM quiz_attempts WHERE enrollment_id = ? AND unit_id = ? AND completed_at IS NULL',
      [enrollment[0].id, unit_id]
    );

    if (incompleteAttempt.length > 0) {
      // Return existing incomplete attempt
      return NextResponse.json({ attempt: incompleteAttempt[0], resumed: true });
    }

    // Create new attempt
    await execute(
      'INSERT INTO quiz_attempts (enrollment_id, unit_id) VALUES (?, ?)',
      [enrollment[0].id, unit_id]
    );

    const attempt = await query<QuizAttempt>(
      `SELECT qa.*, u.name as unit_name
       FROM quiz_attempts qa
       JOIN units u ON qa.unit_id = u.id
       WHERE qa.enrollment_id = ? AND qa.unit_id = ?
       ORDER BY qa.started_at DESC LIMIT 1`,
      [enrollment[0].id, unit_id]
    );

    return NextResponse.json({ attempt: attempt[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating quiz attempt:', error);
    return NextResponse.json(
      { error: 'Failed to start quiz' },
      { status: 500 }
    );
  }
}
