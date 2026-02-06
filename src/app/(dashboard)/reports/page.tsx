'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  BookOpen, 
  HelpCircle, 
  Download, 
  TrendingUp 
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ReportType = 'user-progress' | 'course-completion' | 'quiz-results';

type UserProgressRow = {
  user_id: string;
  user_name: string;
  email: string;
  role: string;
  total_enrollments: number;
  completed: number;
  in_progress: number;
  not_started: number;
  completion_rate: number;
};

type CourseCompletionRow = {
  course_id: string;
  course_name: string;
  category_name: string | null;
  total_enrollments: number;
  completed: number;
  in_progress: number;
  not_started: number;
  completion_rate: number;
};

type QuizResultsRow = {
  unit_id: string;
  quiz_name: string;
  course_name: string;
  total_attempts: number;
  passed: number;
  failed: number;
  pass_rate: number;
  avg_score: number;
};

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('user-progress');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<unknown[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchReport(activeReport);
  }, [activeReport]);

  async function fetchReport(type: ReportType) {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/${type}`);
      const json = await res.json();
      setData(json.data || []);
      setSummary(json.summary || {});
    } catch (error) {
      console.error('Failed to fetch report:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  async function downloadCSV() {
    try {
      const res = await fetch(`/api/reports/${activeReport}?format=csv`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeReport}-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download CSV:', error);
      alert('Failed to download report');
    }
  }

  const reportTabs = [
    { id: 'user-progress' as const, name: 'User Progress', shortName: 'Users', icon: Users },
    { id: 'course-completion' as const, name: 'Course Completion', shortName: 'Courses', icon: BookOpen },
    { id: 'quiz-results' as const, name: 'Quiz Results', shortName: 'Quizzes', icon: HelpCircle },
  ];

  return (
    <div>
      {/* Header - stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Analyze learning progress and outcomes</p>
        </div>
        <button
          onClick={downloadCSV}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Report Tabs - scrollable on mobile */}
      <div className="flex gap-2 mb-4 md:mb-6 overflow-x-auto pb-1">
        {reportTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-sm',
              activeReport === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.name}</span>
            <span className="sm:hidden">{tab.shortName}</span>
          </button>
        ))}
      </div>

      {/* Summary Cards - 2x2 on mobile, 4 col on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        {activeReport === 'user-progress' && (
          <>
            <SummaryCard 
              label="Total Users" 
              value={summary.totalUsers || 0} 
              icon={Users}
            />
            <SummaryCard 
              label="Enrollments" 
              value={summary.totalEnrollments || 0} 
              icon={BookOpen}
            />
            <SummaryCard 
              label="Completed" 
              value={summary.totalCompleted || 0} 
              icon={TrendingUp}
            />
            <SummaryCard 
              label="Avg Rate" 
              value={`${summary.avgCompletionRate?.toFixed(1) || 0}%`} 
              icon={BarChart3}
            />
          </>
        )}
        {activeReport === 'course-completion' && (
          <>
            <SummaryCard 
              label="Total Courses" 
              value={summary.totalCourses || 0} 
              icon={BookOpen}
            />
            <SummaryCard 
              label="Enrollments" 
              value={summary.totalEnrollments || 0} 
              icon={Users}
            />
            <SummaryCard 
              label="Completions" 
              value={summary.totalCompleted || 0} 
              icon={TrendingUp}
            />
            <SummaryCard 
              label="Avg Rate" 
              value={`${summary.avgCompletionRate?.toFixed(1) || 0}%`} 
              icon={BarChart3}
            />
          </>
        )}
        {activeReport === 'quiz-results' && (
          <>
            <SummaryCard 
              label="Total Quizzes" 
              value={summary.totalQuizzes || 0} 
              icon={HelpCircle}
            />
            <SummaryCard 
              label="Attempts" 
              value={summary.totalAttempts || 0} 
              icon={Users}
            />
            <SummaryCard 
              label="Passed" 
              value={summary.totalPassed || 0} 
              icon={TrendingUp}
            />
            <SummaryCard 
              label="Pass Rate" 
              value={`${summary.avgPassRate?.toFixed(1) || 0}%`} 
              icon={BarChart3}
            />
          </>
        )}
      </div>

      {/* Data Table - horizontal scroll on mobile */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="px-6 py-8 text-center text-slate-500">Loading...</div>
        ) : data.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-500">No data available</div>
        ) : (
          <div className="overflow-x-auto">
            {activeReport === 'user-progress' && (
              <UserProgressTable data={data as UserProgressRow[]} />
            )}
            {activeReport === 'course-completion' && (
              <CourseCompletionTable data={data as CourseCompletionRow[]} />
            )}
            {activeReport === 'quiz-results' && (
              <QuizResultsTable data={data as QuizResultsRow[]} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ 
  label, 
  value, 
  icon: Icon 
}: { 
  label: string; 
  value: number | string; 
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 md:p-4">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg">
          <Icon className="w-4 md:w-5 h-4 md:h-5 text-blue-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs md:text-sm text-slate-500 truncate">{label}</p>
          <p className="text-lg md:text-xl font-semibold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function UserProgressTable({ data }: { data: UserProgressRow[] }) {
  return (
    <table className="w-full min-w-[700px]">
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr>
          <th className="text-left px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">User</th>
          <th className="text-left px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">Role</th>
          <th className="text-center px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">Enrolls</th>
          <th className="text-center px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">Done</th>
          <th className="text-center px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">In Prog</th>
          <th className="text-center px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">Not Start</th>
          <th className="text-center px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">Rate</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">
        {data.map((row) => (
          <tr key={row.user_id} className="hover:bg-slate-50">
            <td className="px-4 md:px-6 py-3 md:py-4">
              <p className="font-medium text-slate-900 text-sm">{row.user_name}</p>
              <p className="text-xs md:text-sm text-slate-500 truncate max-w-[150px]">{row.email}</p>
            </td>
            <td className="px-4 md:px-6 py-3 md:py-4 capitalize text-slate-600 text-sm">{row.role}</td>
            <td className="px-4 md:px-6 py-3 md:py-4 text-center text-slate-600 text-sm">{row.total_enrollments}</td>
            <td className="px-4 md:px-6 py-3 md:py-4 text-center text-green-600 font-medium text-sm">{row.completed}</td>
            <td className="px-4 md:px-6 py-3 md:py-4 text-center text-blue-600 font-medium text-sm">{row.in_progress}</td>
            <td className="px-4 md:px-6 py-3 md:py-4 text-center text-slate-400 text-sm">{row.not_started}</td>
            <td className="px-4 md:px-6 py-3 md:py-4 text-center">
              <span className={cn(
                'px-2 py-1 rounded-full text-xs font-medium',
                row.completion_rate >= 80 ? 'bg-green-100 text-green-700' :
                row.completion_rate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                'bg-slate-100 text-slate-600'
              )}>
                {row.completion_rate.toFixed(0)}%
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CourseCompletionTable({ data }: { data: CourseCompletionRow[] }) {
  return (
    <table className="w-full min-w-[700px]">
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr>
          <th className="text-left px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">Course</th>
          <th className="text-left px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">Category</th>
          <th className="text-center px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">Enrolls</th>
          <th className="text-center px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">Done</th>
          <th className="text-center px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">In Prog</th>
          <th className="text-center px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">Not Start</th>
          <th className="text-center px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">Rate</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">
        {data.map((row) => (
          <tr key={row.course_id} className="hover:bg-slate-50">
            <td className="px-4 md:px-6 py-3 md:py-4 font-medium text-slate-900 text-sm">{row.course_name}</td>
            <td className="px-4 md:px-6 py-3 md:py-4 text-slate-600 text-sm">{row.category_name || '—'}</td>
            <td className="px-4 md:px-6 py-3 md:py-4 text-center text-slate-600 text-sm">{row.total_enrollments}</td>
            <td className="px-4 md:px-6 py-3 md:py-4 text-center text-green-600 font-medium text-sm">{row.completed}</td>
            <td className="px-4 md:px-6 py-3 md:py-4 text-center text-blue-600 font-medium text-sm">{row.in_progress}</td>
            <td className="px-4 md:px-6 py-3 md:py-4 text-center text-slate-400 text-sm">{row.not_started}</td>
            <td className="px-4 md:px-6 py-3 md:py-4 text-center">
              <span className={cn(
                'px-2 py-1 rounded-full text-xs font-medium',
                row.completion_rate >= 80 ? 'bg-green-100 text-green-700' :
                row.completion_rate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                'bg-slate-100 text-slate-600'
              )}>
                {row.completion_rate.toFixed(0)}%
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function QuizResultsTable({ data }: { data: QuizResultsRow[] }) {
  return (
    <table className="w-full min-w-[700px]">
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr>
          <th className="text-left px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">Quiz</th>
          <th className="text-left px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">Course</th>
          <th className="text-center px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">Attempts</th>
          <th className="text-center px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">Passed</th>
          <th className="text-center px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">Failed</th>
          <th className="text-center px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">Pass Rate</th>
          <th className="text-center px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-slate-600">Avg</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">
        {data.map((row) => (
          <tr key={row.unit_id} className="hover:bg-slate-50">
            <td className="px-4 md:px-6 py-3 md:py-4 font-medium text-slate-900 text-sm">{row.quiz_name}</td>
            <td className="px-4 md:px-6 py-3 md:py-4 text-slate-600 text-sm">{row.course_name}</td>
            <td className="px-4 md:px-6 py-3 md:py-4 text-center text-slate-600 text-sm">{row.total_attempts}</td>
            <td className="px-4 md:px-6 py-3 md:py-4 text-center text-green-600 font-medium text-sm">{row.passed}</td>
            <td className="px-4 md:px-6 py-3 md:py-4 text-center text-red-600 font-medium text-sm">{row.failed}</td>
            <td className="px-4 md:px-6 py-3 md:py-4 text-center">
              <span className={cn(
                'px-2 py-1 rounded-full text-xs font-medium',
                row.pass_rate >= 80 ? 'bg-green-100 text-green-700' :
                row.pass_rate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-600'
              )}>
                {row.pass_rate.toFixed(0)}%
              </span>
            </td>
            <td className="px-4 md:px-6 py-3 md:py-4 text-center text-slate-600 text-sm">{row.avg_score.toFixed(0)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
