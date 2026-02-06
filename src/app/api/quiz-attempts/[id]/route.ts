import { NextRequest, NextResponse } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { QuizAttempt } from '../route';
import { POINT_VALUES } from '@/app/api/points/route';

// Helper to award points
async function awardPoints(userId: string, points: number): Promise<void> {
  const existing = await queryOne<{ total_points: number }>(
    'SELECT total_points FROM user_points WHERE user_id = ?',
    [userId]
  );

  const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5000];
  const calculateLevel = (pts: number): number => {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (pts >= LEVEL_THRESHOLDS[i]) return i + 1;
    }
    return 1;
  };

  if (existing) {
    const newTotal = existing.total_points + points;
    await execute(
      `UPDATE user_points SET total_points = ?, level = ?, updated_at = datetime('now') WHERE user_id = ?`,
      [newTotal, calculateLevel(newTotal), userId]
    );
  } else {
    await execute(
      `INSERT INTO user_points (user_id, total_points, level) VALUES (?, ?, ?)`,
      [userId, points, calculateLevel(points)]
    );
  }
}

type QuizAnswer = {
  id: string;
  attempt_id: string;
  question_id: string;
  answer: string | null;
  is_correct: number | null;
  // Joined fields
  question_text?: string;
  question_type?: string;
  options_json?: string;
  correct_answer?: string;
  points?: number;
};

// GET /api/quiz-attempts/[id] - Get attempt details with answers
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

  // Get attempt with enrollment info
  const attempt = await query<QuizAttempt & { user_id: string; course_id: string }>(
    `SELECT qa.*, u.name as unit_name, c.name as course_name, e.user_id, c.id as course_id
     FROM quiz_attempts qa
     JOIN units u ON qa.unit_id = u.id
     JOIN courses c ON u.course_id = c.id
     JOIN enrollments e ON qa.enrollment_id = e.id
     WHERE qa.id = ?`,
    [id]
  );

  if (attempt.length === 0) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
  }

  // Learners can only see their own attempts
  if (currentUser.role === 'learner' && attempt[0].user_id !== currentUser.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get answers (include correct answer only if attempt is completed)
  let answersSql = `
    SELECT qa.*,
           q.question_text,
           q.type as question_type,
           q.options_json,
           q.points
  `;
  
  if (attempt[0].completed_at) {
    answersSql += ', q.correct_answer';
  }
  
  answersSql += `
    FROM quiz_answers qa
    JOIN questions q ON qa.question_id = q.id
    WHERE qa.attempt_id = ?
    ORDER BY q.sort_order ASC
  `;

  const answers = await query<QuizAnswer>(answersSql, [id]);

  // Get questions for this unit (for in-progress attempts)
  const questions = await query<{
    id: string;
    question_text: string;
    type: string;
    options_json: string;
    points: number;
    sort_order: number;
  }>(
    `SELECT id, question_text, type, options_json, points, sort_order
     FROM questions
     WHERE unit_id = ?
     ORDER BY sort_order ASC`,
    [attempt[0].unit_id]
  );

  return NextResponse.json({
    attempt: attempt[0],
    answers,
    questions,
  });
}

// POST /api/quiz-attempts/[id] - Submit answers and complete attempt
export async function POST(
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
    // Get attempt
    const attempt = await query<QuizAttempt & { user_id: string; settings_json: string }>(
      `SELECT qa.*, e.user_id, u.settings_json
       FROM quiz_attempts qa
       JOIN enrollments e ON qa.enrollment_id = e.id
       JOIN units u ON qa.unit_id = u.id
       WHERE qa.id = ?`,
      [id]
    );

    if (attempt.length === 0) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (attempt[0].user_id !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (attempt[0].completed_at) {
      return NextResponse.json({ error: 'Attempt already completed' }, { status: 400 });
    }

    const body = await request.json();
    const { answers } = body; // Array of { question_id, answer }

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'answers array is required' }, { status: 400 });
    }

    // Get questions for this unit
    const questions = await query<{
      id: string;
      correct_answer: string;
      points: number;
    }>(
      'SELECT id, correct_answer, points FROM questions WHERE unit_id = ?',
      [attempt[0].unit_id]
    );

    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // Delete existing answers for this attempt
    await execute('DELETE FROM quiz_answers WHERE attempt_id = ?', [id]);

    // Insert answers and calculate score
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const ans of answers) {
      const question = questionMap.get(ans.question_id);
      if (!question) continue;

      const isCorrect = checkAnswer(ans.answer, question.correct_answer);
      totalPoints += question.points;
      if (isCorrect) {
        earnedPoints += question.points;
      }

      await execute(
        'INSERT INTO quiz_answers (attempt_id, question_id, answer, is_correct) VALUES (?, ?, ?, ?)',
        [id, ans.question_id, ans.answer || null, isCorrect ? 1 : 0]
      );
    }

    // Calculate percentage score
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    // Check pass threshold
    const settings = JSON.parse(attempt[0].settings_json || '{}');
    const passThreshold = settings.pass_threshold ?? 70;
    const passed = score >= passThreshold ? 1 : 0;

    // Update attempt
    await execute(
      `UPDATE quiz_attempts SET score = ?, passed = ?, completed_at = datetime('now') WHERE id = ?`,
      [score, passed, id]
    );

    // Award points and update unit progress if passed
    let pointsAwarded = 0;
    if (passed) {
      // Award quiz pass points
      pointsAwarded += POINT_VALUES.quiz_pass;
      await awardPoints(attempt[0].user_id, POINT_VALUES.quiz_pass);

      // Bonus for perfect score
      if (score === 100) {
        pointsAwarded += POINT_VALUES.quiz_perfect;
        await awardPoints(attempt[0].user_id, POINT_VALUES.quiz_perfect);
      }

      await execute(
        `INSERT OR REPLACE INTO unit_progress (enrollment_id, unit_id, status, score, completed_at)
         VALUES (?, ?, 'completed', ?, datetime('now'))`,
        [attempt[0].enrollment_id, attempt[0].unit_id, score]
      );

      // Update enrollment progress
      const enrollment = await query<{ id: string; course_id: string }>(
        'SELECT e.id, c.id as course_id FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE e.id = ?',
        [attempt[0].enrollment_id]
      );

      if (enrollment.length > 0) {
        const totalUnits = await query<{ count: number }>(
          'SELECT COUNT(*) as count FROM units WHERE course_id = ?',
          [enrollment[0].course_id]
        );

        const completedUnits = await query<{ count: number }>(
          `SELECT COUNT(*) as count FROM unit_progress WHERE enrollment_id = ? AND status = 'completed'`,
          [attempt[0].enrollment_id]
        );

        const progressPct =
          totalUnits[0].count > 0
            ? Math.round((completedUnits[0].count / totalUnits[0].count) * 100)
            : 0;

        let status = 'in_progress';
        if (progressPct === 100) {
          status = 'completed';
        }

        await execute(
          `UPDATE enrollments SET status = ?, progress_pct = ?,
           started_at = COALESCE(started_at, datetime('now')),
           completed_at = CASE WHEN ? = 100 THEN datetime('now') ELSE completed_at END
           WHERE id = ?`,
          [status, progressPct, progressPct, attempt[0].enrollment_id]
        );
      }
    }

    // Get updated attempt
    const updatedAttempt = await query<QuizAttempt>(
      `SELECT qa.*, u.name as unit_name,
              (SELECT COUNT(*) FROM quiz_answers WHERE attempt_id = qa.id) as total_questions,
              (SELECT COUNT(*) FROM quiz_answers WHERE attempt_id = qa.id AND is_correct = 1) as correct_answers
       FROM quiz_attempts qa
       JOIN units u ON qa.unit_id = u.id
       WHERE qa.id = ?`,
      [id]
    );

    return NextResponse.json({
      attempt: updatedAttempt[0],
      score,
      passed: !!passed,
      earnedPoints,
      totalPoints,
      pointsAwarded,
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    );
  }
}

// Helper function to check answers
function checkAnswer(userAnswer: string | null, correctAnswer: string | null): boolean {
  if (!userAnswer || !correctAnswer) return false;
  
  // Normalize answers for comparison
  const normalize = (s: string) => s.trim().toLowerCase();
  
  // Handle multiple correct answers (comma-separated)
  const correctAnswers = correctAnswer.split(',').map(normalize);
  const userAns = normalize(userAnswer);
  
  return correctAnswers.includes(userAns);
}
