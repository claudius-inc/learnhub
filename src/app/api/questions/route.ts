import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getSession } from '@/lib/auth';

export type Question = {
  id: string;
  course_id: string;
  unit_id: string | null;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'matching';
  question_text: string;
  options_json: string | null;
  correct_answer: string | null;
  points: number;
  sort_order: number;
  created_at: string;
  // Joined fields
  course_name?: string;
  unit_name?: string;
};

// GET /api/questions - List questions with filters
export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await getSession(sessionId);
  if (!currentUser || currentUser.role === 'learner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('course_id');
  const unitId = searchParams.get('unit_id');
  const type = searchParams.get('type');
  const search = searchParams.get('search') || '';

  let sql = `
    SELECT q.*,
           c.name as course_name,
           u.name as unit_name
    FROM questions q
    JOIN courses c ON q.course_id = c.id
    LEFT JOIN units u ON q.unit_id = u.id
    WHERE 1=1
  `;
  const args: (string | number)[] = [];

  // Instructors can only see their own courses' questions
  if (currentUser.role === 'instructor') {
    sql += ' AND c.created_by = ?';
    args.push(currentUser.id);
  }

  if (courseId) {
    sql += ' AND q.course_id = ?';
    args.push(courseId);
  }

  if (unitId) {
    sql += ' AND q.unit_id = ?';
    args.push(unitId);
  }

  if (type) {
    sql += ' AND q.type = ?';
    args.push(type);
  }

  if (search) {
    sql += ' AND q.question_text LIKE ?';
    args.push(`%${search}%`);
  }

  sql += ' ORDER BY q.sort_order ASC, q.created_at DESC';

  const questions = await query<Question>(sql, args);

  return NextResponse.json({ questions });
}

// POST /api/questions - Create a new question
export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('session')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await getSession(sessionId);
  if (!currentUser || currentUser.role === 'learner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      course_id,
      unit_id,
      type,
      question_text,
      options_json,
      correct_answer,
      points,
      sort_order,
    } = body;

    if (!course_id || !type || !question_text) {
      return NextResponse.json(
        { error: 'course_id, type, and question_text are required' },
        { status: 400 }
      );
    }

    const validTypes = ['multiple_choice', 'true_false', 'fill_blank', 'matching'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify course exists and user has access
    const course = await query<{ id: string; created_by: string }>(
      'SELECT id, created_by FROM courses WHERE id = ?',
      [course_id]
    );

    if (course.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (currentUser.role === 'instructor' && course[0].created_by !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify unit belongs to course if provided
    if (unit_id) {
      const unit = await query<{ id: string }>(
        'SELECT id FROM units WHERE id = ? AND course_id = ?',
        [unit_id, course_id]
      );
      if (unit.length === 0) {
        return NextResponse.json({ error: 'Unit not found in this course' }, { status: 400 });
      }
    }

    // Get max sort_order
    const maxOrder = await query<{ max_order: number | null }>(
      'SELECT MAX(sort_order) as max_order FROM questions WHERE course_id = ? AND unit_id IS ?',
      [course_id, unit_id || null]
    );
    const nextOrder = sort_order ?? (maxOrder[0]?.max_order ?? -1) + 1;

    await execute(
      `INSERT INTO questions (course_id, unit_id, type, question_text, options_json, correct_answer, points, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        course_id,
        unit_id || null,
        type,
        question_text,
        options_json ? JSON.stringify(options_json) : null,
        correct_answer || null,
        points ?? 1,
        nextOrder,
      ]
    );

    const question = await query<Question>(
      `SELECT q.*, c.name as course_name, u.name as unit_name
       FROM questions q
       JOIN courses c ON q.course_id = c.id
       LEFT JOIN units u ON q.unit_id = u.id
       WHERE q.course_id = ? ORDER BY q.created_at DESC LIMIT 1`,
      [course_id]
    );

    return NextResponse.json({ question: question[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    );
  }
}
