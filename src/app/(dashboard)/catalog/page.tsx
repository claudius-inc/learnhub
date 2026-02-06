'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Search,
  Filter,
  Users,
  Layers,
  Clock,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Category = {
  id: string;
  name: string;
  slug: string;
  color: string;
};

type Course = {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  category_id: string | null;
  status: 'draft' | 'published' | 'archived';
  hidden: number;
  category_name: string | null;
  category_color: string | null;
  section_count: number;
  unit_count: number;
  enrollment_count: number;
};

type Enrollment = {
  id: string;
  course_id: string;
  status: string;
  progress_pct: number;
};

export default function CatalogPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coursesRes, categoriesRes, enrollmentsRes] = await Promise.all([
        fetch('/api/courses?status=published'),
        fetch('/api/categories'),
        fetch('/api/enrollments'),
      ]);
      
      const coursesData = await coursesRes.json();
      const categoriesData = await categoriesRes.json();
      const enrollmentsData = await enrollmentsRes.json();
      
      // Filter to only published, non-hidden courses
      const publishedCourses = (coursesData.courses || []).filter(
        (c: Course) => c.status === 'published' && c.hidden !== 1
      );
      
      setCourses(publishedCourses);
      setCategories(categoriesData.categories || []);
      setEnrollments(enrollmentsData.enrollments || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnroll = async (courseId: string) => {
    setEnrolling(courseId);
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseId }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setEnrollments([...enrollments, data.enrollment]);
      } else if (res.status === 409) {
        // Already enrolled, refresh enrollments
        const enrollmentsRes = await fetch('/api/enrollments');
        const enrollmentsData = await enrollmentsRes.json();
        setEnrollments(enrollmentsData.enrollments || []);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to enroll');
      }
    } catch {
      alert('Failed to enroll');
    } finally {
      setEnrolling(null);
    }
  };

  const getEnrollment = (courseId: string) =>
    enrollments.find((e) => e.course_id === courseId);

  const filteredCourses = courses.filter((course) => {
    if (search && !course.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (selectedCategory && course.category_id !== selectedCategory) {
      return false;
    }
    return true;
  });

  // Group courses by category for featured display
  const coursesByCategory = categories
    .map((cat) => ({
      category: cat,
      courses: courses.filter((c) => c.category_id === cat.id),
    }))
    .filter((g) => g.courses.length > 0);

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
        <h1 className="text-2xl font-bold text-slate-900">Course Catalog</h1>
        <p className="text-slate-500">Browse and enroll in available courses</p>
      </div>

      {/* Search and Filters */}
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
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory('')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              selectedCategory === ''
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-300 hover:bg-slate-50'
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedCategory === cat.id
                  ? 'text-white'
                  : 'bg-white border border-slate-300 hover:bg-slate-50'
              )}
              style={
                selectedCategory === cat.id
                  ? { backgroundColor: cat.color }
                  : undefined
              }
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">No courses available</h3>
          <p className="text-slate-500">
            {search || selectedCategory
              ? 'Try adjusting your search or filter.'
              : 'Check back later for new courses.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const enrollment = getEnrollment(course.id);
            const isEnrolled = !!enrollment;

            return (
              <div
                key={course.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
              >
                {/* Thumbnail */}
                <div className="h-40 bg-slate-100 relative overflow-hidden">
                  {course.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.thumbnail_url}
                      alt={course.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-slate-300" />
                    </div>
                  )}
                  {course.category_name && (
                    <span
                      className="absolute top-3 left-3 px-2.5 py-1 text-xs font-medium rounded-full text-white"
                      style={{ backgroundColor: course.category_color || '#6366f1' }}
                    >
                      {course.category_name}
                    </span>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-semibold text-lg text-slate-900 mb-2 line-clamp-2">
                    {course.name}
                  </h3>

                  {course.description && (
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                      {course.description}
                    </p>
                  )}

                  {/* Course Stats */}
                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Layers className="w-4 h-4" />
                      {course.unit_count} units
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {course.enrollment_count} enrolled
                    </span>
                  </div>

                  {/* Action Button */}
                  <div className="mt-auto">
                    {isEnrolled ? (
                      <div className="space-y-2">
                        {enrollment.progress_pct > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                              <div
                                className="bg-blue-600 rounded-full h-1.5 transition-all"
                                style={{ width: `${enrollment.progress_pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500">
                              {enrollment.progress_pct}%
                            </span>
                          </div>
                        )}
                        <Link
                          href={`/learn/${course.id}`}
                          className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {enrollment.status === 'completed' ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Review Course
                            </>
                          ) : enrollment.progress_pct > 0 ? (
                            <>
                              Continue
                              <ChevronRight className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              Start Learning
                              <ChevronRight className="w-4 h-4" />
                            </>
                          )}
                        </Link>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEnroll(course.id)}
                        disabled={enrolling === course.id}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {enrolling === course.id ? 'Enrolling...' : 'Enroll Now'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
