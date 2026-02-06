'use client';

import { useState, useEffect } from 'react';
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
