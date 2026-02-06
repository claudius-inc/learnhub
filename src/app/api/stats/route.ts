import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function GET() {
  try {
    const totalUsers = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users');
    const totalCourses = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM courses WHERE status = ?', ['published']);
    const totalEnrollments = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM enrollments');
    const completedEnrollments = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM enrollments WHERE status = ?', ['completed']);
    const certificatesIssued = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM certificates');
    const activeToday = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE last_login_at > datetime("now", "-1 day")');

    const completionRate = totalEnrollments?.count 
      ? Math.round((completedEnrollments?.count ?? 0) / totalEnrollments.count * 100)
      : 0;

    return NextResponse.json({
      totalUsers: totalUsers?.count ?? 0,
      totalCourses: totalCourses?.count ?? 0,
      totalEnrollments: totalEnrollments?.count ?? 0,
      completionRate,
      activeToday: activeToday?.count ?? 0,
      certificatesIssued: certificatesIssued?.count ?? 0,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
