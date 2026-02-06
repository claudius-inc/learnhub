'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Play,
  CheckCircle2,
  Clock,
  ChevronRight,
  Search,
  Trophy,
  Star,
  Award,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_pct: number;
  started_at: string | null;
  completed_at: string | null;
  enrolled_at: string;
  course_name: string;
  course_thumbnail_url: string | null;
  category_name: string | null;
  category_color: string | null;
};

type UserPoints = {
  user_id: string;
  total_points: number;
  level: number;
};

type UserBadge = {
  badge_id: string;
  badge_name: string;
  badge_description: string;
  badge_icon_url: string | null;
  earned_at: string;
};

const LEVEL_NAMES = [
  'Beginner', 'Novice', 'Apprentice', 'Journeyman', 'Expert',
  'Master', 'Grandmaster', 'Legend', 'Champion', 'Transcendent',
];

const statusConfig = {
  not_started: { label: 'Not Started', color: 'bg-slate-100 text-slate-600', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-600', icon: Play },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-600', icon: CheckCircle2 },
};

export default function MyCoursesPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [nextLevel, setNextLevel] = useState<{ level: number; pointsNeeded: number; progress: number } | null>(null);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/enrollments');
      const data = await res.json();
      setEnrollments(data.enrollments || []);
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPoints = async () => {
    try {
      const res = await fetch('/api/points');
      const data = await res.json();
      setPoints(data.points);
      setNextLevel(data.nextLevel);
    } catch (error) {
      console.error('Failed to fetch points:', error);
    }
  };

  const fetchBadges = async () => {
    try {
      const res = await fetch('/api/badges');
      const data = await res.json();
      setBadges(data.userBadges || []);
    } catch (error) {
      console.error('Failed to fetch badges:', error);
    }
  };

  useEffect(() => {
    fetchEnrollments();
    fetchPoints();
    fetchBadges();
  }, []);

  const filteredEnrollments = enrollments.filter((e) => {
    if (filter !== 'all' && e.status !== filter) return false;
    if (search && !e.course_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const inProgressCount = enrollments.filter((e) => e.status === 'in_progress').length;
  const completedCount = enrollments.filter((e) => e.status === 'completed').length;

  // Find the most recent in-progress course to continue
  const continueEnrollment = enrollments
    .filter((e) => e.status === 'in_progress')
    .sort((a, b) => new Date(b.started_at || b.enrolled_at).getTime() - new Date(a.started_at || a.enrolled_at).getTime())[0];

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
        <p className="text-slate-500">Track your learning progress</p>
      </div>

      {/* Continue Learning Card */}
      {continueEnrollment && (
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm mb-1">Continue Learning</p>
              <h2 className="text-xl font-semibold mb-2">{continueEnrollment.course_name}</h2>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-blue-500/30 rounded-full h-2 w-48">
                  <div
                    className="bg-white rounded-full h-2 transition-all"
                    style={{ width: `${continueEnrollment.progress_pct}%` }}
                  />
                </div>
                <span className="text-sm text-blue-200">{continueEnrollment.progress_pct}% complete</span>
              </div>
            </div>
            <Link
              href={`/learn/${continueEnrollment.course_id}`}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              <Play className="w-4 h-4" />
              Resume
            </Link>
          </div>
        </div>
      )}

      {/* Gamification Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Points & Level Card */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Trophy className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-amber-700">Your Level</p>
                <h3 className="text-xl font-bold text-amber-900">
                  {points ? `Level ${points.level}` : 'Level 1'}
                </h3>
                <p className="text-xs text-amber-600">
                  {points ? LEVEL_NAMES[Math.min(points.level - 1, LEVEL_NAMES.length - 1)] : LEVEL_NAMES[0]}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-amber-900">{points?.total_points || 0}</p>
              <p className="text-sm text-amber-600">points</p>
            </div>
          </div>
          {nextLevel && nextLevel.progress < 100 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-amber-600 mb-1">
                <span>Progress to Level {nextLevel.level}</span>
                <span>{nextLevel.progress}%</span>
              </div>
              <div className="bg-amber-200 rounded-full h-2">
                <div
                  className="bg-amber-500 rounded-full h-2 transition-all"
                  style={{ width: `${nextLevel.progress}%` }}
                />
              </div>
            </div>
          )}
          <Link
            href="/leaderboard"
            className="mt-3 flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900"
          >
            <TrendingUp className="w-4 h-4" />
            View Leaderboard
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Badges Card */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-purple-700">Badges Earned</p>
              <h3 className="text-xl font-bold text-purple-900">{badges.length}</h3>
            </div>
          </div>
          {badges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {badges.slice(0, 4).map((badge) => (
                <div
                  key={badge.badge_id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-purple-200"
                  title={badge.badge_description}
                >
                  <Star className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-purple-700">{badge.badge_name}</span>
                </div>
              ))}
              {badges.length > 4 && (
                <span className="px-3 py-1.5 text-sm text-purple-600">
                  +{badges.length - 4} more
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-purple-600">
              Complete courses and quizzes to earn badges!
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{enrollments.length}</p>
            <p className="text-sm text-slate-500">Total Courses</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-100 rounded-lg">
            <Play className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{inProgressCount}</p>
            <p className="text-sm text-slate-500">In Progress</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{completedCount}</p>
            <p className="text-sm text-slate-500">Completed</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as typeof filter)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                filter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-300 hover:bg-slate-50'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Course List */}
      {filteredEnrollments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">
            {enrollments.length === 0 ? 'No courses yet' : 'No courses match your filters'}
          </h3>
          <p className="text-slate-500 mb-4">
            {enrollments.length === 0
              ? 'Browse the course catalog to find courses to enroll in.'
              : 'Try adjusting your search or filter.'}
          </p>
          {enrollments.length === 0 && (
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Browse Catalog
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEnrollments.map((enrollment) => {
            const status = statusConfig[enrollment.status];
            const StatusIcon = status.icon;

            return (
              <Link
                key={enrollment.id}
                href={`/learn/${enrollment.course_id}`}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow group"
              >
                {/* Thumbnail */}
                <div className="h-32 bg-slate-100 relative overflow-hidden">
                  {enrollment.course_thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={enrollment.course_thumbnail_url}
                      alt={enrollment.course_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-slate-300" />
                    </div>
                  )}
                  {/* Progress overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white/30 rounded-full h-1.5">
                        <div
                          className="bg-white rounded-full h-1.5 transition-all"
                          style={{ width: `${enrollment.progress_pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-white">{enrollment.progress_pct}%</span>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 line-clamp-2">
                      {enrollment.course_name}
                    </h3>
                    <span className={cn('shrink-0 p-1.5 rounded-lg', status.color)}>
                      <StatusIcon className="w-4 h-4" />
                    </span>
                  </div>

                  {enrollment.category_name && (
                    <span
                      className="inline-block px-2 py-0.5 text-xs rounded-full mb-2"
                      style={{
                        backgroundColor: (enrollment.category_color || '#6366f1') + '20',
                        color: enrollment.category_color || '#6366f1',
                      }}
                    >
                      {enrollment.category_name}
                    </span>
                  )}

                  <p className="text-sm text-slate-500">
                    {enrollment.status === 'completed' && enrollment.completed_at
                      ? `Completed ${new Date(enrollment.completed_at).toLocaleDateString()}`
                      : enrollment.status === 'in_progress' && enrollment.started_at
                        ? `Started ${new Date(enrollment.started_at).toLocaleDateString()}`
                        : `Enrolled ${new Date(enrollment.enrolled_at).toLocaleDateString()}`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
