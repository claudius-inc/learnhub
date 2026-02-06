'use client';

import { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  FileText,
  Video,
  File,
  HelpCircle,
  ClipboardList,
  ExternalLink,
  Menu,
  X,
  BookOpen,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Section = {
  id: string;
  name: string;
  sort_order: number;
};

type Unit = {
  id: string;
  section_id: string | null;
  type: 'text' | 'video' | 'document' | 'quiz' | 'survey' | 'link';
  name: string;
  content: string | null;
  sort_order: number;
};

type UnitProgress = {
  unit_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
};

type Enrollment = {
  id: string;
  status: string;
  progress_pct: number;
};

type Course = {
  id: string;
  name: string;
  description: string | null;
};

const unitTypeIcons = {
  text: FileText,
  video: Video,
  document: File,
  quiz: HelpCircle,
  survey: ClipboardList,
  link: ExternalLink,
};

export default function LearnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = use(params);
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [unitProgress, setUnitProgress] = useState<UnitProgress[]>([]);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch course data
      const courseRes = await fetch(`/api/courses/${courseId}`);
      if (!courseRes.ok) {
        router.push('/my-courses');
        return;
      }
      const courseData = await courseRes.json();
      setCourse(courseData.course);
      setSections(courseData.sections || []);
      setUnits(courseData.units || []);

      // Fetch enrollment
      const enrollmentRes = await fetch(`/api/enrollments?course_id=${courseId}`);
      const enrollmentData = await enrollmentRes.json();
      const myEnrollment = enrollmentData.enrollments?.[0];
      
      if (!myEnrollment) {
        // Not enrolled, redirect to catalog
        router.push('/catalog');
        return;
      }
      
      setEnrollment(myEnrollment);

      // Fetch unit progress
      const progressRes = await fetch(`/api/enrollments/${myEnrollment.id}`);
      const progressData = await progressRes.json();
      setUnitProgress(progressData.unit_progress || []);

      // Set first incomplete unit as active, or first unit
      const allUnits = courseData.units || [];
      const progressMap = new Map<string, UnitProgress>(
        (progressData.unit_progress || []).map((p: UnitProgress) => [p.unit_id, p] as [string, UnitProgress])
      );
      
      const firstIncomplete = allUnits.find(
        (u: Unit) => progressMap.get(u.id)?.status !== 'completed'
      );
      setActiveUnitId(firstIncomplete?.id || allUnits[0]?.id || null);
    } catch (error) {
      console.error('Failed to load course:', error);
      router.push('/my-courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Build ordered list of all units
  const orderedUnits = useMemo(() => {
    const sortedSections = [...sections].sort((a, b) => a.sort_order - b.sort_order);
    const result: Unit[] = [];

    // Unsectioned units first
    const unsectioned = units
      .filter((u) => u.section_id === null)
      .sort((a, b) => a.sort_order - b.sort_order);
    result.push(...unsectioned);

    // Then units by section
    for (const section of sortedSections) {
      const sectionUnits = units
        .filter((u) => u.section_id === section.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      result.push(...sectionUnits);
    }

    return result;
  }, [sections, units]);

  const activeUnit = orderedUnits.find((u) => u.id === activeUnitId);
  const activeIndex = orderedUnits.findIndex((u) => u.id === activeUnitId);
  const prevUnit = activeIndex > 0 ? orderedUnits[activeIndex - 1] : null;
  const nextUnit = activeIndex < orderedUnits.length - 1 ? orderedUnits[activeIndex + 1] : null;

  const getUnitStatus = (unitId: string) =>
    unitProgress.find((p) => p.unit_id === unitId)?.status || 'not_started';

  const isUnitCompleted = (unitId: string) => getUnitStatus(unitId) === 'completed';

  const handleMarkComplete = async () => {
    if (!activeUnit || !enrollment) return;
    setCompleting(true);

    try {
      // Update unit progress
      const res = await fetch(`/api/enrollments/${enrollment.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: activeUnit.id,
          status: 'completed',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setUnitProgress((prev) => {
          const existing = prev.findIndex((p) => p.unit_id === activeUnit.id);
          if (existing >= 0) {
            const newProgress = [...prev];
            newProgress[existing] = { ...newProgress[existing], status: 'completed' };
            return newProgress;
          }
          return [...prev, { unit_id: activeUnit.id, status: 'completed' }];
        });

        // Update enrollment progress
        if (data.enrollment) {
          setEnrollment(data.enrollment);
        }

        // Auto-advance to next unit
        if (nextUnit) {
          setActiveUnitId(nextUnit.id);
        }
      }
    } catch (error) {
      console.error('Failed to mark complete:', error);
    } finally {
      setCompleting(false);
    }
  };

  // Render video embed
  const renderVideoEmbed = (url: string) => {
    let embedUrl = url;

    // YouTube
    const ytMatch = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/
    );
    if (ytMatch) {
      embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return (
      <div className="aspect-video w-full">
        <iframe
          src={embedUrl}
          className="w-full h-full rounded-lg"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!course || !enrollment) {
    return null;
  }

  const completedCount = unitProgress.filter((p) => p.status === 'completed').length;
  const progress = orderedUnits.length > 0 
    ? Math.round((completedCount / orderedUnits.length) * 100) 
    : 0;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-64 top-0 h-screen w-80 bg-white border-r border-slate-200 flex flex-col transition-transform z-20',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-4 border-b border-slate-200">
          <Link
            href="/my-courses"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Courses
          </Link>
          <h2 className="font-semibold text-slate-900 line-clamp-2">{course.name}</h2>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 rounded-full h-2 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{progress}%</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {/* Unsectioned units */}
          {units.filter((u) => u.section_id === null).length > 0 && (
            <div className="mb-4">
              {units
                .filter((u) => u.section_id === null)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((unit) => {
                  const Icon = unitTypeIcons[unit.type] || FileText;
                  const completed = isUnitCompleted(unit.id);
                  const active = unit.id === activeUnitId;

                  return (
                    <button
                      key={unit.id}
                      onClick={() => setActiveUnitId(unit.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors',
                        active
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-slate-100 text-slate-700'
                      )}
                    >
                      {completed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="line-clamp-1">{unit.name}</span>
                    </button>
                  );
                })}
            </div>
          )}

          {/* Sections with units */}
          {sections
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((section) => {
              const sectionUnits = units
                .filter((u) => u.section_id === section.id)
                .sort((a, b) => a.sort_order - b.sort_order);

              if (sectionUnits.length === 0) return null;

              return (
                <div key={section.id} className="mb-4">
                  <h3 className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {section.name}
                  </h3>
                  {sectionUnits.map((unit) => {
                    const Icon = unitTypeIcons[unit.type] || FileText;
                    const completed = isUnitCompleted(unit.id);
                    const active = unit.id === activeUnitId;

                    return (
                      <button
                        key={unit.id}
                        onClick={() => setActiveUnitId(unit.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors',
                          active
                            ? 'bg-blue-50 text-blue-700'
                            : 'hover:bg-slate-100 text-slate-700'
                        )}
                      >
                        {completed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="line-clamp-1">{unit.name}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
        </nav>
      </aside>

      {/* Toggle button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed left-64 top-4 z-30 p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50"
        style={{ marginLeft: sidebarOpen ? '320px' : '0' }}
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Main Content */}
      <main
        className={cn(
          'flex-1 transition-all',
          sidebarOpen ? 'ml-80' : 'ml-0'
        )}
      >
        {activeUnit ? (
          <div className="max-w-4xl mx-auto p-8">
            {/* Unit Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                {(() => {
                  const Icon = unitTypeIcons[activeUnit.type] || FileText;
                  return <Icon className="w-4 h-4" />;
                })()}
                <span className="capitalize">{activeUnit.type}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{activeUnit.name}</h1>
            </div>

            {/* Unit Content */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              {activeUnit.type === 'quiz' ? (
                <div className="text-center py-8">
                  <HelpCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Quiz Time!</h3>
                  <p className="text-slate-600 mb-6">
                    Test your knowledge with this quiz. Good luck!
                  </p>
                  <Link
                    href={`/courses/${courseId}/units/${activeUnit.id}/quiz`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg"
                  >
                    <Play className="w-5 h-5" />
                    Start Quiz
                  </Link>
                </div>
              ) : activeUnit.type === 'video' && activeUnit.content ? (
                renderVideoEmbed(activeUnit.content)
              ) : activeUnit.type === 'link' && activeUnit.content ? (
                <div className="text-center py-8">
                  <ExternalLink className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">This unit links to an external resource.</p>
                  <a
                    href={activeUnit.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Open Link
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ) : activeUnit.content ? (
                <div className="prose prose-slate max-w-none">
                  <div className="whitespace-pre-wrap">{activeUnit.content}</div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p>No content available for this unit.</p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <div>
                {prevUnit && (
                  <button
                    onClick={() => setActiveUnitId(prevUnit.id)}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {!isUnitCompleted(activeUnit.id) && activeUnit.type !== 'quiz' && (
                  <button
                    onClick={handleMarkComplete}
                    disabled={completing}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {completing ? 'Saving...' : 'Mark Complete'}
                  </button>
                )}

                {nextUnit ? (
                  <button
                    onClick={() => setActiveUnitId(nextUnit.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  progress === 100 && (
                    <Link
                      href="/my-courses"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Finish Course
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">No content yet</h2>
              <p className="text-slate-500">This course doesn&apos;t have any units.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
