'use client';

import { useEffect, useState } from 'react';
import { Users, BookOpen, GraduationCap, Award, TrendingUp, Clock } from 'lucide-react';

type Stats = {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  completionRate: number;
  activeToday: number;
  certificatesIssued: number;
};

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  color = 'blue' 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {trend && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(setStats)
      .catch(() => {
        // Use placeholder stats if API fails
        setStats({
          totalUsers: 1,
          totalCourses: 0,
          totalEnrollments: 0,
          completionRate: 0,
          activeToday: 1,
          certificatesIssued: 0,
        });
      });
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Welcome back! Here's your training overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers ?? '-'}
          icon={Users}
          trend="+12% this month"
          color="blue"
        />
        <StatCard
          title="Active Courses"
          value={stats?.totalCourses ?? '-'}
          icon={BookOpen}
          color="green"
        />
        <StatCard
          title="Enrollments"
          value={stats?.totalEnrollments ?? '-'}
          icon={GraduationCap}
          color="purple"
        />
        <StatCard
          title="Completion Rate"
          value={stats ? `${stats.completionRate}%` : '-'}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Active Today"
          value={stats?.activeToday ?? '-'}
          icon={Clock}
          color="orange"
        />
        <StatCard
          title="Certificates Issued"
          value={stats?.certificatesIssued ?? '-'}
          icon={Award}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">No recent activity yet.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Popular Courses</h2>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">No courses created yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
