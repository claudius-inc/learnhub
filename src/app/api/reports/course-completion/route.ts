import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

type CourseCompletionRow = {
  course_id: string;
  course_name: string;
  category_name: string | null;
  total_enrollments: number;
  completed: number;
  in_progress: number;
  not_started: number;
};

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format');

  const rows = await query<CourseCompletionRow>(`
    SELECT 
      c.id as course_id,
      c.name as course_name,
      cat.name as category_name,
      COUNT(e.id) as total_enrollments,
      SUM(CASE WHEN e.status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN e.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN e.status = 'not_started' THEN 1 ELSE 0 END) as not_started
    FROM courses c
    LEFT JOIN categories cat ON c.category_id = cat.id
    LEFT JOIN enrollments e ON c.id = e.course_id
    WHERE c.status = 'published'
    GROUP BY c.id
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
    totalCourses: data.length,
    totalEnrollments: data.reduce((sum, r) => sum + r.total_enrollments, 0),
    totalCompleted: data.reduce((sum, r) => sum + r.completed, 0),
    avgCompletionRate: data.length > 0 
      ? data.reduce((sum, r) => sum + r.completion_rate, 0) / data.length 
      : 0
  };

  if (format === 'csv') {
    const headers = ['Course ID', 'Course Name', 'Category', 'Total Enrollments', 'Completed', 'In Progress', 'Not Started', 'Completion Rate'];
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      csvRows.push([
        row.course_id,
        `"${row.course_name.replace(/"/g, '""')}"`,
        row.category_name ? `"${row.category_name.replace(/"/g, '""')}"` : '',
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
        'Content-Disposition': 'attachment; filename="course-completion-report.csv"'
      }
    });
  }

  return NextResponse.json({ data, summary });
}
