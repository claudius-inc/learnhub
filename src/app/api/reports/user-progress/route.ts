import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

type UserProgressRow = {
  user_id: string;
  user_name: string;
  email: string;
  role: string;
  total_enrollments: number;
  completed: number;
  in_progress: number;
  not_started: number;
};

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format');

  const rows = await query<UserProgressRow>(`
    SELECT 
      u.id as user_id,
      u.name as user_name,
      u.email,
      u.role,
      COUNT(e.id) as total_enrollments,
      SUM(CASE WHEN e.status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN e.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN e.status = 'not_started' THEN 1 ELSE 0 END) as not_started
    FROM users u
    LEFT JOIN enrollments e ON u.id = e.user_id
    WHERE u.role = 'learner'
    GROUP BY u.id
    ORDER BY total_enrollments DESC
  `);

  const data = rows.map(row => ({
    ...row,
    total_enrollments: Number(row.total_enrollments),
    completed: Number(row.completed),
    in_progress: Number(row.in_progress),
    not_started: Number(row.not_started),
    completion_rate: row.total_enrollments > 0 
      ? (Number(row.completed) / Number(row.total_enrollments)) * 100 
      : 0
  }));

  const summary = {
    totalUsers: data.length,
    totalEnrollments: data.reduce((sum, r) => sum + r.total_enrollments, 0),
    totalCompleted: data.reduce((sum, r) => sum + r.completed, 0),
    avgCompletionRate: data.length > 0 
      ? data.reduce((sum, r) => sum + r.completion_rate, 0) / data.length 
      : 0
  };

  if (format === 'csv') {
    const headers = ['User ID', 'Name', 'Email', 'Role', 'Total Enrollments', 'Completed', 'In Progress', 'Not Started', 'Completion Rate'];
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      csvRows.push([
        row.user_id,
        `"${row.user_name.replace(/"/g, '""')}"`,
        row.email,
        row.role,
        row.total_enrollments,
        row.completed,
        row.in_progress,
        row.not_started,
        `${row.completion_rate.toFixed(1)}%`
      ].join(','));
    }

    return new NextResponse(csvRows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="user-progress-report.csv"'
      }
    });
  }

  return NextResponse.json({ data, summary });
}
