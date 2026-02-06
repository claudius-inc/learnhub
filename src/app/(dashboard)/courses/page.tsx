'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  BookOpen,
  Eye,
  ChevronLeft,
  ChevronRight,
  Users,
  Layers,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CourseModal } from '@/components/CourseModal';

type Category = {
  id: string;
  name: string;
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
  time_limit_days: number | null;
  created_at: string;
  updated_at: string;
  category_name: string | null;
  category_color: string | null;
  creator_name: string | null;
  section_count: number;
  unit_count: number;
  enrollment_count: number;
};

type CoursesResponse = {
  courses: Course[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-amber-100 text-amber-700',
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category_id', categoryFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());

      const res = await fetch(`/api/courses?${params}`);
      const data: CoursesResponse = await res.json();
      setCourses(data.courses);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, pagination.page, pagination.limit]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, categoryFilter, statusFilter]);

  const handleDelete = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;

    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCourses();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete course');
      }
    } catch {
      alert('Failed to delete course');
    }
    setOpenDropdown(null);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setModalOpen(true);
    setOpenDropdown(null);
  };

  const handleAddCourse = () => {
    setEditingCourse(null);
    setModalOpen(true);
  };

  return (
    <div>
      {/* Header - stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Courses</h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage your courses</p>
        </div>
        <button
          onClick={handleAddCourse}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Create Course
        </button>
      </div>

      {/* Filters - stack on mobile */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 md:mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:gap-4">
          <div className="w-full md:flex-1 md:min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-2 md:gap-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex-1 md:flex-none px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 md:flex-none px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Courses Grid - 1 col mobile, 2 col tablet, 3 col desktop */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 md:p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">No courses yet</h3>
          <p className="text-slate-500 mb-4">Create your first course to get started</p>
          <button
            onClick={handleAddCourse}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 relative">
                {course.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={course.thumbnail_url}
                    alt={course.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-blue-300" />
                  </div>
                )}
                {course.hidden === 1 && (
                  <span className="absolute top-2 left-2 px-2 py-1 bg-slate-900/70 text-white text-xs rounded">
                    Hidden
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{course.name}</h3>
                    {course.category_name && (
                      <span
                        className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full"
                        style={{
                          backgroundColor: (course.category_color || '#6366f1') + '20',
                          color: course.category_color || '#6366f1',
                        }}
                      >
                        {course.category_name}
                      </span>
                    )}
                  </div>
                  <div className="relative ml-2">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === course.id ? null : course.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    {openDropdown === course.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenDropdown(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 z-20 py-1">
                          <Link
                            href={`/courses/${course.id}`}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Link>
                          <button
                            onClick={() => handleEdit(course)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(course.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {course.description && (
                  <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                    {course.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {course.section_count}s / {course.unit_count}u
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {course.enrollment_count}
                    </span>
                    {course.time_limit_days && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {course.time_limit_days}d
                      </span>
                    )}
                  </div>
                  <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full capitalize', statusColors[course.status])}>
                    {course.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination - responsive */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 bg-white rounded-xl border border-slate-200 px-4 md:px-6 py-4">
          <p className="text-sm text-slate-600 text-center sm:text-left">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} courses
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page === 1}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Course Modal */}
      <CourseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        course={editingCourse}
        categories={categories}
        onSave={fetchCourses}
      />
    </div>
  );
}
