'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  BookOpen, 
  Users, 
  Clock, 
  Calendar,
  Layers,
  FileText,
  Video,
  File,
  HelpCircle,
  ClipboardList,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Settings
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
  settings_json: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category_name: string | null;
  category_color: string | null;
  creator_name: string | null;
  section_count: number;
  unit_count: number;
  enrollment_count: number;
};

type Section = {
  id: string;
  course_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

type Unit = {
  id: string;
  course_id: string;
  section_id: string | null;
  type: 'text' | 'video' | 'document' | 'quiz' | 'survey' | 'link';
  name: string;
  content: string | null;
  settings_json: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-amber-100 text-amber-700',
};

const unitTypeIcons: Record<string, typeof FileText> = {
  text: FileText,
  video: Video,
  document: File,
  quiz: HelpCircle,
  survey: ClipboardList,
  link: ExternalLink,
};

const unitTypeColors: Record<string, string> = {
  text: 'bg-blue-100 text-blue-600',
  video: 'bg-red-100 text-red-600',
  document: 'bg-amber-100 text-amber-600',
  quiz: 'bg-purple-100 text-purple-600',
  survey: 'bg-green-100 text-green-600',
  link: 'bg-slate-100 text-slate-600',
};

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);

  const fetchCourse = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/courses/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Course not found');
        } else {
          setError('Failed to load course');
        }
        return;
      }
      const data = await res.json();
      setCourse(data.course);
      setSections(data.sections || []);
      setUnits(data.units || []);
    } catch {
      setError('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

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
    fetchCourse();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;

    try {
      const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/courses');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete course');
      }
    } catch {
      alert('Failed to delete course');
    }
  };

  // Group units by section
  const getUnitsForSection = (sectionId: string | null) => {
    return units
      .filter((u) => u.section_id === sectionId)
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  const unsectionedUnits = getUnitsForSection(null);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">Loading...</div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">{error || 'Course not found'}</h3>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/courses"
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{course.name}</h1>
            <span className={cn('px-2.5 py-1 text-xs font-medium rounded-full capitalize', statusColors[course.status])}>
              {course.status}
            </span>
            {course.hidden === 1 && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                <EyeOff className="w-3 h-3" />
                Hidden
              </span>
            )}
          </div>
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {course.description && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Description</h2>
              <p className="text-slate-600 whitespace-pre-wrap">{course.description}</p>
            </div>
          )}

          {/* Course Structure */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Course Structure</h2>
              <span className="text-sm text-slate-500">
                {sections.length} sections · {units.length} units
              </span>
            </div>

            {sections.length === 0 && units.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>No content yet</p>
                <p className="text-sm mt-1">Add sections and units to build your course</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Unsectioned units */}
                {unsectionedUnits.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                      <h3 className="font-medium text-slate-700">Unsectioned Units</h3>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {unsectionedUnits.map((unit) => {
                        const Icon = unitTypeIcons[unit.type] || FileText;
                        return (
                          <li key={unit.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50">
                            <span className={cn('p-2 rounded-lg', unitTypeColors[unit.type])}>
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="flex-1 text-slate-700">{unit.name}</span>
                            <span className="text-xs text-slate-400 capitalize">{unit.type}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Sections with units */}
                {sections
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((section) => {
                    const sectionUnits = getUnitsForSection(section.id);
                    return (
                      <div key={section.id} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                          <h3 className="font-medium text-slate-700">{section.name}</h3>
                          <span className="text-xs text-slate-500">{sectionUnits.length} units</span>
                        </div>
                        {sectionUnits.length === 0 ? (
                          <div className="px-4 py-6 text-center text-slate-400 text-sm">
                            No units in this section
                          </div>
                        ) : (
                          <ul className="divide-y divide-slate-100">
                            {sectionUnits.map((unit) => {
                              const Icon = unitTypeIcons[unit.type] || FileText;
                              return (
                                <li key={unit.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50">
                                  <span className={cn('p-2 rounded-lg', unitTypeColors[unit.type])}>
                                    <Icon className="w-4 h-4" />
                                  </span>
                                  <span className="flex-1 text-slate-700">{unit.name}</span>
                                  <span className="text-xs text-slate-400 capitalize">{unit.type}</span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Stats */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Course Info</h2>
            <dl className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Enrollments</dt>
                  <dd className="font-medium text-slate-900">{course.enrollment_count}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Layers className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Structure</dt>
                  <dd className="font-medium text-slate-900">
                    {course.section_count} sections · {course.unit_count} units
                  </dd>
                </div>
              </div>
              {course.time_limit_days && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Time Limit</dt>
                    <dd className="font-medium text-slate-900">{course.time_limit_days} days</dd>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Created</dt>
                  <dd className="font-medium text-slate-900">
                    {new Date(course.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </div>
              {course.creator_name && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Users className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Created by</dt>
                    <dd className="font-medium text-slate-900">{course.creator_name}</dd>
                  </div>
                </div>
              )}
            </dl>
          </div>

          {/* Thumbnail Preview */}
          {course.thumbnail_url && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Thumbnail</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={course.thumbnail_url}
                alt={course.name}
                className="w-full rounded-lg"
              />
            </div>
          )}
        </div>
      </div>

      {/* Course Modal */}
      <CourseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        course={course}
        categories={categories}
        onSave={fetchCourse}
      />
    </div>
  );
}
