import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export type Certificate = {
  id: string;
  enrollment_id: string;
  template_id: string | null;
  verification_code: string;
  issued_at: string;
  expires_at: string | null;
  // Joined fields
  user_name?: string;
  user_email?: string;
  course_name?: string;
  course_id?: string;
  completed_at?: string;
};

// GET /api/certificates - List certificates
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
  const enrollmentId = searchParams.get('enrollment_id');

  let sql = `
    SELECT cert.*,
           u.name as user_name,
           u.email as user_email,
           c.name as course_name,
           c.id as course_id,
           e.completed_at
    FROM certificates cert
    JOIN enrollments e ON cert.enrollment_id = e.id
    JOIN users u ON e.user_id = u.id
    JOIN courses c ON e.course_id = c.id
    WHERE 1=1
  `;
  const args: string[] = [];

  // Learners can only see their own certificates
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

  if (enrollmentId) {
    sql += ' AND cert.enrollment_id = ?';
    args.push(enrollmentId);
  }

  sql += ' ORDER BY cert.issued_at DESC';

  const certificates = await query<Certificate>(sql, args);

  return NextResponse.json({ certificates });
}

// POST /api/certificates - Generate a certificate
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
    const { enrollment_id, template_id, expires_in_days } = body;

    if (!enrollment_id) {
      return NextResponse.json({ error: 'enrollment_id is required' }, { status: 400 });
    }

    // Get enrollment
    const enrollment = await query<{ id: string; user_id: string; course_id: string; status: string }>(
      'SELECT id, user_id, course_id, status FROM enrollments WHERE id = ?',
      [enrollment_id]
    );

    if (enrollment.length === 0) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Learners can only generate certificates for themselves
    if (currentUser.role === 'learner' && enrollment[0].user_id !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if course is completed
    if (enrollment[0].status !== 'completed') {
      return NextResponse.json({ error: 'Course not yet completed' }, { status: 400 });
    }

    // Check if certificate already exists
    const existing = await query<{ id: string; verification_code: string }>(
      'SELECT id, verification_code FROM certificates WHERE enrollment_id = ?',
      [enrollment_id]
    );

    if (existing.length > 0) {
      // Return existing certificate
      const cert = await query<Certificate>(
        `SELECT cert.*, u.name as user_name, c.name as course_name
         FROM certificates cert
         JOIN enrollments e ON cert.enrollment_id = e.id
         JOIN users u ON e.user_id = u.id
         JOIN courses c ON e.course_id = c.id
         WHERE cert.id = ?`,
        [existing[0].id]
      );
      return NextResponse.json({ certificate: cert[0], exists: true });
    }

    // Generate verification code
    const verificationCode = uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();

    // Calculate expiration date if specified
    let expiresAt: string | null = null;
    if (expires_in_days && expires_in_days > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + expires_in_days);
      expiresAt = expDate.toISOString();
    }

    // Get default template if not specified
    let templateId = template_id;
    if (!templateId) {
      const defaultTemplate = await query<{ id: string }>(
        'SELECT id FROM certificate_templates ORDER BY created_at DESC LIMIT 1'
      );
      templateId = defaultTemplate[0]?.id || null;
    }

    // Create certificate
    await execute(
      `INSERT INTO certificates (enrollment_id, template_id, verification_code, expires_at)
       VALUES (?, ?, ?, ?)`,
      [enrollment_id, templateId, verificationCode, expiresAt]
    );

    const certificate = await query<Certificate>(
      `SELECT cert.*, u.name as user_name, u.email as user_email, c.name as course_name, c.id as course_id
       FROM certificates cert
       JOIN enrollments e ON cert.enrollment_id = e.id
       JOIN users u ON e.user_id = u.id
       JOIN courses c ON e.course_id = c.id
       WHERE cert.enrollment_id = ?`,
      [enrollment_id]
    );

    return NextResponse.json({ certificate: certificate[0] }, { status: 201 });
  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json(
      { error: 'Failed to generate certificate' },
      { status: 500 }
    );
  }
}
