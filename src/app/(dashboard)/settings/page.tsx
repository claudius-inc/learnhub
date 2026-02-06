'use client';

import { useState, useEffect } from 'react';
import { Palette, Award, Star, Save, Loader2 } from 'lucide-react';

type CertificateTemplate = {
  id: string;
  name: string;
};

type SettingsData = {
  site_name: string;
  site_tagline: string;
  primary_color: string;
  default_certificate_template_id: string;
  points_course_completion: number;
  points_quiz_pass: number;
  points_quiz_perfect: number;
  points_certificate_earned: number;
};

const defaultSettings: SettingsData = {
  site_name: 'LearnHub',
  site_tagline: 'Your Learning Platform',
  primary_color: '#2563eb',
  default_certificate_template_id: '',
  points_course_completion: 100,
  points_quiz_pass: 25,
  points_quiz_perfect: 50,
  points_certificate_earned: 200,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchTemplates();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings) {
        setSettings({ ...defaultSettings, ...data.settings });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/certificates/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  }

  function handleChange(key: keyof SettingsData, value: string | number) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header - stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure your LMS settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 w-full sm:w-auto"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
      </div>

      {message && (
        <div className={`mb-4 md:mb-6 px-4 py-3 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Site Branding */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Palette className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-base md:text-lg font-semibold text-slate-900">Site Branding</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Site Name
            </label>
            <input
              type="text"
              value={settings.site_name}
              onChange={(e) => handleChange('site_name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
              placeholder="LearnHub"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Site Tagline
            </label>
            <input
              type="text"
              value={settings.site_tagline}
              onChange={(e) => handleChange('site_tagline', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
              placeholder="Your Learning Platform"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.primary_color}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                className="w-10 md:w-12 h-10 border border-slate-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={settings.primary_color}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                className="w-28 md:w-32 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="#2563eb"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Certificate Settings */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Award className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-base md:text-lg font-semibold text-slate-900">Certificate Settings</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Default Certificate Template
          </label>
          <select
            value={settings.default_certificate_template_id}
            onChange={(e) => handleChange('default_certificate_template_id', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
          >
            <option value="">Select a template...</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            This template will be used when courses don&apos;t have a specific template assigned.
          </p>
        </div>
      </div>

      {/* Gamification Points */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Star className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-base md:text-lg font-semibold text-slate-900">Gamification Points</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Course Completion
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={settings.points_course_completion}
                onChange={(e) => handleChange('points_course_completion', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
              />
              <span className="text-slate-500 text-sm shrink-0">pts</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Quiz Pass
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={settings.points_quiz_pass}
                onChange={(e) => handleChange('points_quiz_pass', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
              />
              <span className="text-slate-500 text-sm shrink-0">pts</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Quiz Perfect Score
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={settings.points_quiz_perfect}
                onChange={(e) => handleChange('points_quiz_perfect', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
              />
              <span className="text-slate-500 text-sm shrink-0">pts</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Certificate Earned
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={settings.points_certificate_earned}
                onChange={(e) => handleChange('points_certificate_earned', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
              />
              <span className="text-slate-500 text-sm shrink-0">pts</span>
            </div>
          </div>
        </div>

        <p className="text-xs md:text-sm text-slate-500 mt-4">
          Points are awarded to learners for completing activities. They contribute to levels and leaderboard rankings.
        </p>
      </div>
    </div>
  );
}
