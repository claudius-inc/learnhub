import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Question } from '../route';

// GET /api/questions/[id] - Get a single question
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
  if (!currentUser || currentUser.role === 'learner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const question = await query<Question & { course_created_by: string }>(
    `SELECT q.*, c.name as course_name, u.name as unit_name, c.created_by as course_created_by
     FROM questions q
     JOIN courses c ON q.course_id = c.id
     LEFT JOIN units u ON q.unit_id = u.id
     WHERE q.id = ?`,
    [id]
  );

  if (question.length === 0) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 });
  }

  // Instructors can only see their own courses' questions
  if (currentUser.role === 'instructor' && question[0].course_created_by !== currentUser.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ question: question[0] });
}

// PUT /api/questions/[id] - Update a question
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
    // Get existing question with course info
    const existing = await query<Question & { course_created_by: string }>(
      `SELECT q.*, c.created_by as course_created_by
       FROM questions q
       JOIN courses c ON q.course_id = c.id
       WHERE q.id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    if (currentUser.role === 'instructor' && existing[0].course_created_by !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      type,
      question_text,
      options_json,
      correct_answer,
      points,
      sort_order,
      unit_id,
    } = body;

    const updates: string[] = [];
    const args: (string | number | null)[] = [];

    if (type !== undefined) {
      const validTypes = ['multiple_choice', 'true_false', 'fill_blank', 'matching'];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
      updates.push('type = ?');
      args.push(type);
    }

    if (question_text !== undefined) {
      updates.push('question_text = ?');
      args.push(question_text);
    }

    if (options_json !== undefined) {
      updates.push('options_json = ?');
      args.push(options_json ? JSON.stringify(options_json) : null);
    }

    if (correct_answer !== undefined) {
      updates.push('correct_answer = ?');
      args.push(correct_answer);
    }

    if (points !== undefined) {
      updates.push('points = ?');
      args.push(points);
    }

    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      args.push(sort_order);
    }

    if (unit_id !== undefined) {
      // Verify unit belongs to course if provided
      if (unit_id) {
        const unit = await query<{ id: string }>(
          'SELECT id FROM units WHERE id = ? AND course_id = ?',
          [unit_id, existing[0].course_id]
        );
        if (unit.length === 0) {
          return NextResponse.json({ error: 'Unit not found in this course' }, { status: 400 });
        }
      }
      updates.push('unit_id = ?');
      args.push(unit_id || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    args.push(id);
    await execute(`UPDATE questions SET ${updates.join(', ')} WHERE id = ?`, args);

    const question = await query<Question>(
      `SELECT q.*, c.name as course_name, u.name as unit_name
       FROM questions q
       JOIN courses c ON q.course_id = c.id
       LEFT JOIN units u ON q.unit_id = u.id
       WHERE q.id = ?`,
      [id]
    );

    return NextResponse.json({ question: question[0] });
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    );
  }
}

// DELETE /api/questions/[id] - Delete a question
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
    const existing = await query<{ id: string; course_created_by: string }>(
      `SELECT q.id, c.created_by as course_created_by
       FROM questions q
       JOIN courses c ON q.course_id = c.id
       WHERE q.id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    if (currentUser.role === 'instructor' && existing[0].course_created_by !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await execute('DELETE FROM questions WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}
