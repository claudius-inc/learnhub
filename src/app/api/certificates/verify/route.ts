import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Certificate } from '../route';

// GET /api/certificates/verify?code=XXXX - Public certificate verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
  }

  // Find certificate by verification code
  const certificate = await query<Certificate & { template_html?: string }>(
    `SELECT cert.*,
            u.name as user_name,
            u.email as user_email,
            c.name as course_name,
            c.id as course_id,
            e.completed_at,
            ct.html_template as template_html
     FROM certificates cert
     JOIN enrollments e ON cert.enrollment_id = e.id
     JOIN users u ON e.user_id = u.id
     JOIN courses c ON e.course_id = c.id
     LEFT JOIN certificate_templates ct ON cert.template_id = ct.id
     WHERE cert.verification_code = ?`,
    [code.toUpperCase()]
  );

  if (certificate.length === 0) {
    return NextResponse.json(
      { valid: false, error: 'Certificate not found' },
      { status: 404 }
    );
  }

  const cert = certificate[0];

  // Check if expired
  if (cert.expires_at) {
    const expiresAt = new Date(cert.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json({
        valid: false,
        expired: true,
        certificate: {
          user_name: cert.user_name,
          course_name: cert.course_name,
          issued_at: cert.issued_at,
          expires_at: cert.expires_at,
        },
      });
    }
  }

  return NextResponse.json({
    valid: true,
    certificate: {
      verification_code: cert.verification_code,
      user_name: cert.user_name,
      course_name: cert.course_name,
      issued_at: cert.issued_at,
      expires_at: cert.expires_at,
      completed_at: cert.completed_at,
    },
  });
}
