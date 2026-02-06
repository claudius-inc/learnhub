import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

type QuizResultsRow = {
  unit_id: string;
  quiz_name: string;
  course_name: string;
  total_attempts: number;
  passed: number;
  failed: number;
  avg_score: number | null;
};

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format');

  const rows = await query<QuizResultsRow>(`
    SELECT 
      u.id as unit_id,
      u.name as quiz_name,
      c.name as course_name,
      COUNT(qa.id) as total_attempts,
      SUM(CASE WHEN qa.passed = 1 THEN 1 ELSE 0 END) as passed,
      SUM(CASE WHEN qa.passed = 0 THEN 1 ELSE 0 END) as failed,
      AVG(qa.score) as avg_score
    FROM units u
    JOIN courses c ON u.course_id = c.id
    LEFT JOIN quiz_attempts qa ON u.id = qa.unit_id AND qa.completed_at IS NOT NULL
    WHERE u.type = 'quiz'
    GROUP BY u.id
    ORDER BY total_attempts DESC
  `);

  const data = rows.map(row => ({
    ...row,
    total_attempts: Number(row.total_attempts),
    passed: Number(row.passed),
    failed: Number(row.failed),
    avg_score: row.avg_score !== null ? Number(row.avg_score) : 0,
    pass_rate: row.total_attempts > 0 
      ? (Number(row.passed) / Number(row.total_attempts)) * 100 
      : 0
  }));

  const summary = {
    totalQuizzes: data.length,
    totalAttempts: data.reduce((sum, r) => sum + r.total_attempts, 0),
    totalPassed: data.reduce((sum, r) => sum + r.passed, 0),
    avgPassRate: data.length > 0 
      ? data.reduce((sum, r) => sum + r.pass_rate, 0) / data.length 
      : 0
  };

  if (format === 'csv') {
    const headers = ['Quiz ID', 'Quiz Name', 'Course', 'Total Attempts', 'Passed', 'Failed', 'Pass Rate', 'Avg Score'];
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      csvRows.push([
        row.unit_id,
        `"${row.quiz_name.replace(/"/g, '""')}"`,
        `"${row.course_name.replace(/"/g, '""')}"`,
        row.total_attempts,
        row.passed,
        row.failed,
        `${row.pass_rate.toFixed(1)}%`,
        `${row.avg_score.toFixed(1)}%`
      ].join(','));
    }

    return new NextResponse(csvRows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="quiz-results-report.csv"'
      }
    });
  }

  return NextResponse.json({ data, summary });
}
