'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  ChevronDown,
  CheckCircle,
  Circle,
  HelpCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Question = {
  id: string;
  course_id: string;
  unit_id: string | null;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'matching';
  question_text: string;
  options_json: string | null;
  correct_answer: string | null;
  points: number;
  sort_order: number;
  created_at: string;
  course_name: string;
  unit_name: string | null;
};

type Course = {
  id: string;
  name: string;
};

type Unit = {
  id: string;
  name: string;
  type: string;
};

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
];

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formCourseId, setFormCourseId] = useState('');
  const [formUnitId, setFormUnitId] = useState('');
  const [formType, setFormType] = useState<string>('multiple_choice');
  const [formQuestionText, setFormQuestionText] = useState('');
  const [formOptions, setFormOptions] = useState<string[]>(['', '', '', '']);
  const [formCorrectAnswer, setFormCorrectAnswer] = useState('');
  const [formPoints, setFormPoints] = useState(1);

  // AI generation state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiCourseId, setAiCourseId] = useState('');
  const [aiContent, setAiContent] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiTypes, setAiTypes] = useState(['multiple_choice', 'true_false', 'fill_blank']);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [selectedGenerated, setSelectedGenerated] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchQuestions();
    fetchCourses();
  }, [filterCourse, filterType, search]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCourse) params.set('course_id', filterCourse);
      if (filterType) params.set('type', filterType);
      if (search) params.set('search', search);

      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses?limit=100');
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  const fetchUnits = async (courseId: string) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/units`);
      const data = await res.json();
      // Filter for quiz units only
      setUnits((data.units || []).filter((u: Unit) => u.type === 'quiz'));
    } catch (err) {
      console.error('Failed to load units:', err);
      setUnits([]);
    }
  };

  const openModal = (question?: Question) => {
    if (question) {
      setEditingQuestion(question);
      setFormCourseId(question.course_id);
      setFormUnitId(question.unit_id || '');
      setFormType(question.type);
      setFormQuestionText(question.question_text);
      setFormCorrectAnswer(question.correct_answer || '');
      setFormPoints(question.points);
      try {
        setFormOptions(
          question.options_json ? JSON.parse(question.options_json) : ['', '', '', '']
        );
      } catch {
        setFormOptions(['', '', '', '']);
      }
      fetchUnits(question.course_id);
    } else {
      setEditingQuestion(null);
      setFormCourseId('');
      setFormUnitId('');
      setFormType('multiple_choice');
      setFormQuestionText('');
      setFormOptions(['', '', '', '']);
      setFormCorrectAnswer('');
      setFormPoints(1);
      setUnits([]);
    }
    setShowModal(true);
  };

  const handleCourseChange = (courseId: string) => {
    setFormCourseId(courseId);
    setFormUnitId('');
    if (courseId) {
      fetchUnits(courseId);
    } else {
      setUnits([]);
    }
  };

  const handleSave = async () => {
    if (!formCourseId || !formQuestionText.trim()) return;
    setSaving(true);

    try {
      const body = {
        course_id: formCourseId,
        unit_id: formUnitId || null,
        type: formType,
        question_text: formQuestionText.trim(),
        options_json:
          formType === 'multiple_choice'
            ? formOptions.filter((o) => o.trim())
            : null,
        correct_answer: formCorrectAnswer || null,
        points: formPoints,
      };

      const url = editingQuestion
        ? `/api/questions/${editingQuestion.id}`
        : '/api/questions';
      const method = editingQuestion ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowModal(false);
        fetchQuestions();
      }
    } catch (err) {
      console.error('Failed to save question:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return;

    try {
      await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      fetchQuestions();
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  };

  // AI Question Generation
  const handleAiGenerate = async () => {
    if (!aiCourseId) return;
    
    setAiLoading(true);
    setAiError('');
    setGeneratedQuestions([]);
    setSelectedGenerated(new Set());

    try {
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: aiCourseId,
          content: aiContent || undefined,
          count: aiCount,
          types: aiTypes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAiError(data.error || 'Failed to generate questions');
        return;
      }

      setGeneratedQuestions(data.questions || []);
      // Select all by default
      setSelectedGenerated(new Set(data.questions.map((_: Question, i: number) => i)));
    } catch {
      setAiError('Failed to connect to AI service');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleGeneratedSelection = (index: number) => {
    const newSelected = new Set(selectedGenerated);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedGenerated(newSelected);
  };

  const saveGeneratedQuestions = async () => {
    if (selectedGenerated.size === 0) return;
    setSaving(true);

    try {
      const questionsToSave = generatedQuestions.filter((_, i) => selectedGenerated.has(i));
      
      for (const q of questionsToSave) {
        await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_id: aiCourseId,
            unit_id: null,
            type: q.type,
            question_text: q.question_text,
            options_json: q.type === 'multiple_choice' ? q.options_json : null,
            correct_answer: q.correct_answer,
            points: q.points || 1,
          }),
        });
      }

      setShowAiModal(false);
      setGeneratedQuestions([]);
      setSelectedGenerated(new Set());
      fetchQuestions();
    } catch (err) {
      console.error('Failed to save questions:', err);
      setAiError('Failed to save some questions');
    } finally {
      setSaving(false);
    }
  };

  const parseOptions = (json: string | null): string[] => {
    if (!json) return [];
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  };

  const getTypeLabel = (type: string) => {
    return QUESTION_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Question Bank</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowAiModal(true);
              setAiCourseId('');
              setAiContent('');
              setAiCount(5);
              setAiError('');
              setGeneratedQuestions([]);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700"
          >
            <Sparkles className="w-4 h-4" />
            Generate Questions
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search questions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg"
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg"
          >
            <option value="">All Types</option>
            {QUESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Questions List */}
      <div className="bg-white rounded-xl border border-slate-200">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No questions found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {questions.map((q) => (
              <div key={q.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 mb-1">
                      {q.question_text}
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {getTypeLabel(q.type)}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                        {q.course_name}
                      </span>
                      {q.unit_name && (
                        <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded">
                          {q.unit_name}
                        </span>
                      )}
                      <span className="text-slate-500">
                        {q.points} pt{q.points !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Show options for multiple choice */}
                    {q.type === 'multiple_choice' && q.options_json && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {parseOptions(q.options_json).map((opt, i) => (
                          <span
                            key={i}
                            className={cn(
                              'px-2 py-0.5 text-sm rounded border',
                              opt === q.correct_answer
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            )}
                          >
                            {opt === q.correct_answer && (
                              <CheckCircle className="w-3 h-3 inline mr-1" />
                            )}
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}

                    {q.type === 'true_false' && q.correct_answer && (
                      <div className="mt-2 text-sm text-green-600">
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        Correct: {q.correct_answer}
                      </div>
                    )}

                    {q.type === 'fill_blank' && q.correct_answer && (
                      <div className="mt-2 text-sm text-green-600">
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        Answer: {q.correct_answer}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openModal(q)}
                      className="p-2 hover:bg-slate-100 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-2 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold">
                {editingQuestion ? 'Edit Question' : 'Add Question'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Course & Unit Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Course *
                  </label>
                  <select
                    value={formCourseId}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    disabled={!!editingQuestion}
                  >
                    <option value="">Select Course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Quiz Unit
                  </label>
                  <select
                    value={formUnitId}
                    onChange={(e) => setFormUnitId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    disabled={!formCourseId}
                  >
                    <option value="">Question Bank (No Unit)</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Question Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Question Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Points
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formPoints}
                    onChange={(e) => setFormPoints(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Question *
                </label>
                <textarea
                  value={formQuestionText}
                  onChange={(e) => setFormQuestionText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Enter your question..."
                />
              </div>

              {/* Multiple Choice Options */}
              {formType === 'multiple_choice' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Options
                  </label>
                  <div className="space-y-2">
                    {formOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormCorrectAnswer(opt)}
                          className={cn(
                            'p-1 rounded',
                            formCorrectAnswer === opt && opt
                              ? 'text-green-600'
                              : 'text-slate-300 hover:text-slate-500'
                          )}
                          title="Set as correct answer"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOptions = [...formOptions];
                            newOptions[i] = e.target.value;
                            setFormOptions(newOptions);
                          }}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                          placeholder={`Option ${i + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                    Click the checkmark to set the correct answer
                  </p>
                </div>
              )}

              {/* True/False Correct Answer */}
              {formType === 'true_false' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Correct Answer
                  </label>
                  <div className="flex gap-4">
                    {['True', 'False'].map((val) => (
                      <label key={val} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="trueFalse"
                          checked={formCorrectAnswer === val}
                          onChange={() => setFormCorrectAnswer(val)}
                          className="w-4 h-4 text-blue-600"
                        />
                        {val}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Fill in the Blank Correct Answer */}
              {formType === 'fill_blank' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Correct Answer(s)
                  </label>
                  <input
                    type="text"
                    value={formCorrectAnswer}
                    onChange={(e) => setFormCorrectAnswer(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="Separate multiple accepted answers with commas"
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formCourseId || !formQuestionText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Question'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Questions Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-purple-600" />
                <h2 className="text-lg font-semibold text-purple-900">
                  AI Generate Questions
                </h2>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Course Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Select Course *
                </label>
                <select
                  value={aiCourseId}
                  onChange={(e) => setAiCourseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select a course...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-slate-500 mt-1">
                  Questions will be generated from course content, or you can provide custom content below.
                </p>
              </div>

              {/* Custom Content (Optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Custom Content (Optional)
                </label>
                <textarea
                  value={aiContent}
                  onChange={(e) => setAiContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Leave empty to use course text content, or paste specific content to generate questions from..."
                />
              </div>

              {/* Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Number of Questions
                  </label>
                  <input
                    type="number"
                    value={aiCount}
                    onChange={(e) => setAiCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
                    min={1}
                    max={20}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Question Types
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {QUESTION_TYPES.map((t) => (
                      <label key={t.value} className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={aiTypes.includes(t.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAiTypes([...aiTypes, t.value]);
                            } else {
                              setAiTypes(aiTypes.filter((x) => x !== t.value));
                            }
                          }}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span className="text-sm">{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {aiError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {aiError}
                </div>
              )}

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiLoading || !aiCourseId || aiTypes.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Questions
                  </>
                )}
              </button>

              {/* Generated Questions Preview */}
              {generatedQuestions.length > 0 && (
                <div className="border border-green-200 rounded-lg overflow-hidden">
                  <div className="p-4 bg-green-50 border-b border-green-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-green-800">Generated Questions</h4>
                      <p className="text-sm text-green-600">
                        {selectedGenerated.size} of {generatedQuestions.length} selected
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedGenerated.size === generatedQuestions.length) {
                          setSelectedGenerated(new Set());
                        } else {
                          setSelectedGenerated(new Set(generatedQuestions.map((_, i) => i)));
                        }
                      }}
                      className="text-sm text-green-700 hover:text-green-800"
                    >
                      {selectedGenerated.size === generatedQuestions.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="divide-y divide-green-100 max-h-64 overflow-y-auto">
                    {generatedQuestions.map((q, i) => (
                      <div
                        key={i}
                        className={cn(
                          'p-3 cursor-pointer transition-colors',
                          selectedGenerated.has(i) ? 'bg-green-50' : 'bg-white hover:bg-slate-50'
                        )}
                        onClick={() => toggleGeneratedSelection(i)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedGenerated.has(i)}
                            onChange={() => toggleGeneratedSelection(i)}
                            className="mt-1 w-4 h-4 text-green-600 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">{q.question_text}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                                {getTypeLabel(q.type)}
                              </span>
                              {q.correct_answer && (
                                <span className="text-xs text-green-600">
                                  Answer: {q.correct_answer}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              {generatedQuestions.length > 0 && (
                <button
                  onClick={saveGeneratedQuestions}
                  disabled={saving || selectedGenerated.size === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : `Save ${selectedGenerated.size} Question${selectedGenerated.size !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
