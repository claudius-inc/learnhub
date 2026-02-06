'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Modal } from './Modal';

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
};

type GeneratedOutline = {
  name: string;
  description: string;
  sections: {
    name: string;
    units: {
      name: string;
      type: 'text' | 'video' | 'quiz';
      description: string;
    }[];
  }[];
};

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course?: Course | null;
  categories: Category[];
  onSave: () => void;
}

export function CourseModal({ isOpen, onClose, course, categories, onSave }: CourseModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    thumbnail_url: '',
    category_id: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    hidden: false,
    time_limit_days: '',
  });

  // AI generation state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiLevel, setAiLevel] = useState('intermediate');
  const [aiUnitCount, setAiUnitCount] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [generatedOutline, setGeneratedOutline] = useState<GeneratedOutline | null>(null);

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) return;
    
    setAiLoading(true);
    setAiError('');
    setGeneratedOutline(null);

    try {
      const res = await fetch('/api/ai/generate-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          level: aiLevel,
          unitCount: aiUnitCount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAiError(data.error || 'Failed to generate outline');
        return;
      }

      setGeneratedOutline(data.outline);
      // Auto-fill form with generated content
      setFormData(prev => ({
        ...prev,
        name: data.outline.name,
        description: data.outline.description,
      }));
    } catch {
      setAiError('Failed to connect to AI service');
    } finally {
      setAiLoading(false);
    }
  };

  const applyOutline = () => {
    if (!generatedOutline) return;
    setFormData(prev => ({
      ...prev,
      name: generatedOutline.name,
      description: generatedOutline.description,
    }));
    setShowAiPanel(false);
  };

  useEffect(() => {
    if (course) {
      setFormData({
        name: course.name,
        description: course.description || '',
        thumbnail_url: course.thumbnail_url || '',
        category_id: course.category_id || '',
        status: course.status,
        hidden: Boolean(course.hidden),
        time_limit_days: course.time_limit_days?.toString() || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        thumbnail_url: '',
        category_id: '',
        status: 'draft',
        hidden: false,
        time_limit_days: '',
      });
    }
    setError('');
    // Reset AI state
    setShowAiPanel(false);
    setAiTopic('');
    setAiError('');
    setGeneratedOutline(null);
  }, [course, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        thumbnail_url: formData.thumbnail_url || null,
        category_id: formData.category_id || null,
        status: formData.status,
        hidden: formData.hidden,
        time_limit_days: formData.time_limit_days ? parseInt(formData.time_limit_days) : null,
      };

      const url = course ? `/api/courses/${course.id}` : '/api/courses';
      const method = course ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save course');
        return;
      }

      onSave();
      onClose();
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={course ? 'Edit Course' : 'Create Course'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* AI Generate Panel */}
        {!course && (
          <div className="border border-purple-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAiPanel(!showAiPanel)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-900">AI Generate Outline</span>
              </div>
              <span className="text-sm text-purple-600">{showAiPanel ? 'Hide' : 'Expand'}</span>
            </button>
            
            {showAiPanel && (
              <div className="p-4 bg-white border-t border-purple-100 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Course Topic
                  </label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g., Introduction to Python Programming"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Difficulty Level
                    </label>
                    <select
                      value={aiLevel}
                      onChange={(e) => setAiLevel(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      ~Number of Units
                    </label>
                    <input
                      type="number"
                      value={aiUnitCount}
                      onChange={(e) => setAiUnitCount(Math.max(1, Math.min(15, parseInt(e.target.value) || 5)))}
                      min={1}
                      max={15}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {aiError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {aiError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={aiLoading || !aiTopic.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Outline
                    </>
                  )}
                </button>

                {/* Generated Outline Preview */}
                {generatedOutline && (
                  <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-green-800">Generated Outline</h4>
                      <button
                        type="button"
                        onClick={applyOutline}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Apply & Close
                      </button>
                    </div>
                    <p className="text-sm font-medium text-slate-900">{generatedOutline.name}</p>
                    <p className="text-sm text-slate-600 mb-3">{generatedOutline.description}</p>
                    <div className="space-y-2 text-sm">
                      {generatedOutline.sections.map((section, i) => (
                        <div key={i}>
                          <p className="font-medium text-slate-700">{section.name}</p>
                          <ul className="ml-4 text-slate-500">
                            {section.units.map((unit, j) => (
                              <li key={j} className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 text-xs rounded ${
                                  unit.type === 'quiz' ? 'bg-amber-100 text-amber-700' :
                                  unit.type === 'video' ? 'bg-blue-100 text-blue-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>{unit.type}</span>
                                {unit.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                      Note: The outline preview is for reference. Units will need to be created manually after saving the course.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Course Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Thumbnail URL
          </label>
          <input
            type="url"
            value={formData.thumbnail_url}
            onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
            placeholder="https://example.com/image.jpg"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Category
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' | 'archived' })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Time Limit (days)
            </label>
            <input
              type="number"
              value={formData.time_limit_days}
              onChange={(e) => setFormData({ ...formData, time_limit_days: e.target.value })}
              placeholder="No limit"
              min={1}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-slate-500">Days to complete after enrollment</p>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer mt-6">
              <input
                type="checkbox"
                checked={formData.hidden}
                onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">Hidden from catalog</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : course ? 'Update Course' : 'Create Course'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
