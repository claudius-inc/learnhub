'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Save,
  FileText,
  Video,
  File,
  HelpCircle,
  ClipboardList,
  ExternalLink,
  X,
  Check,
  Layers,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

type Course = {
  id: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
};

const unitTypes = [
  { value: 'text', label: 'Text', icon: FileText, color: 'bg-blue-100 text-blue-600' },
  { value: 'video', label: 'Video', icon: Video, color: 'bg-red-100 text-red-600' },
  { value: 'document', label: 'Document', icon: File, color: 'bg-amber-100 text-amber-600' },
  { value: 'quiz', label: 'Quiz', icon: HelpCircle, color: 'bg-purple-100 text-purple-600' },
  { value: 'survey', label: 'Survey', icon: ClipboardList, color: 'bg-green-100 text-green-600' },
  { value: 'link', label: 'Link', icon: ExternalLink, color: 'bg-slate-100 text-slate-600' },
] as const;

const getUnitTypeInfo = (type: string) =>
  unitTypes.find((t) => t.value === type) || unitTypes[0];

export default function CourseBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = use(params);
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Section editing state
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [addingSectionName, setAddingSectionName] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);

  // Unit editing state
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [addingUnitToSection, setAddingUnitToSection] = useState<string | null>(null);
  const [newUnit, setNewUnit] = useState({ name: '', type: 'text' as Unit['type'], content: '' });

  const fetchCourse = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`);
      if (!res.ok) {
        router.push('/courses');
        return;
      }
      const data = await res.json();
      setCourse(data.course);
      setSections(data.sections || []);
      setUnits(data.units || []);
    } catch {
      router.push('/courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Section CRUD
  const handleAddSection = async () => {
    if (!addingSectionName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addingSectionName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSections([...sections, data.section]);
        setAddingSectionName('');
        setShowAddSection(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSection = async (sectionId: string) => {
    if (!newSectionName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/sections/${sectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSectionName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSections(sections.map((s) => (s.id === sectionId ? data.section : s)));
        setEditingSectionId(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section? Units will become unsectioned.')) return;
    try {
      const res = await fetch(`/api/courses/${courseId}/sections/${sectionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSections(sections.filter((s) => s.id !== sectionId));
        setUnits(units.map((u) => (u.section_id === sectionId ? { ...u, section_id: null } : u)));
      }
    } catch {
      alert('Failed to delete section');
    }
  };

  // Section reordering
  const moveSectionUp = async (index: number) => {
    if (index === 0) return;
    const sortedSections = [...sections].sort((a, b) => a.sort_order - b.sort_order);
    const newSections = [...sortedSections];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    const updates = newSections.map((s, i) => ({ id: s.id, sort_order: i }));

    setSections(newSections.map((s, i) => ({ ...s, sort_order: i })));

    await fetch(`/api/courses/${courseId}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'sections', items: updates }),
    });
  };

  const moveSectionDown = async (index: number) => {
    const sortedSections = [...sections].sort((a, b) => a.sort_order - b.sort_order);
    if (index >= sortedSections.length - 1) return;
    const newSections = [...sortedSections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    const updates = newSections.map((s, i) => ({ id: s.id, sort_order: i }));

    setSections(newSections.map((s, i) => ({ ...s, sort_order: i })));

    await fetch(`/api/courses/${courseId}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'sections', items: updates }),
    });
  };

  // Unit CRUD
  const handleAddUnit = async (sectionId: string | null) => {
    if (!newUnit.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUnit.name.trim(),
          type: newUnit.type,
          section_id: sectionId,
          content: newUnit.content || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setUnits([...units, data.unit]);
        setNewUnit({ name: '', type: 'text', content: '' });
        setAddingUnitToSection(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUnit = async () => {
    if (!editingUnit || !editingUnit.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/units/${editingUnit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingUnit.name.trim(),
          type: editingUnit.type,
          content: editingUnit.content,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setUnits(units.map((u) => (u.id === editingUnit.id ? data.unit : u)));
        setEditingUnit(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm('Delete this unit?')) return;
    try {
      const res = await fetch(`/api/courses/${courseId}/units/${unitId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setUnits(units.filter((u) => u.id !== unitId));
      }
    } catch {
      alert('Failed to delete unit');
    }
  };

  // Unit reordering within a section
  const moveUnitUp = async (sectionId: string | null, index: number) => {
    const sectionUnits = units
      .filter((u) => u.section_id === sectionId)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (index === 0) return;

    const newUnits = [...sectionUnits];
    [newUnits[index - 1], newUnits[index]] = [newUnits[index], newUnits[index - 1]];
    const updates = newUnits.map((u, i) => ({ id: u.id, sort_order: i, section_id: sectionId }));

    setUnits(
      units.map((u) => {
        const upd = updates.find((x) => x.id === u.id);
        return upd ? { ...u, sort_order: upd.sort_order } : u;
      })
    );

    await fetch(`/api/courses/${courseId}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'units', items: updates }),
    });
  };

  const moveUnitDown = async (sectionId: string | null, index: number) => {
    const sectionUnits = units
      .filter((u) => u.section_id === sectionId)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (index >= sectionUnits.length - 1) return;

    const newUnits = [...sectionUnits];
    [newUnits[index], newUnits[index + 1]] = [newUnits[index + 1], newUnits[index]];
    const updates = newUnits.map((u, i) => ({ id: u.id, sort_order: i, section_id: sectionId }));

    setUnits(
      units.map((u) => {
        const upd = updates.find((x) => x.id === u.id);
        return upd ? { ...u, sort_order: upd.sort_order } : u;
      })
    );

    await fetch(`/api/courses/${courseId}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'units', items: updates }),
    });
  };

  const getUnitsForSection = (sectionId: string | null) =>
    units.filter((u) => u.section_id === sectionId).sort((a, b) => a.sort_order - b.sort_order);

  const sortedSections = [...sections].sort((a, b) => a.sort_order - b.sort_order);
  const unsectionedUnits = getUnitsForSection(null);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">Course not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/courses/${courseId}`}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Course Builder</h1>
          <p className="text-sm text-slate-500">{course.name}</p>
        </div>
        <Link
          href={`/courses/${courseId}`}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Check className="w-4 h-4" />
          Done
        </Link>
      </div>

      <div className="space-y-6">
        {/* Unsectioned Units */}
        {unsectionedUnits.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-medium text-slate-700">Unsectioned Units</h3>
              <button
                onClick={() => setAddingUnitToSection('__unsectioned__')}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Unit
              </button>
            </div>
            <UnitList
              units={unsectionedUnits}
              sectionId={null}
              onEdit={setEditingUnit}
              onDelete={handleDeleteUnit}
              onMoveUp={(i) => moveUnitUp(null, i)}
              onMoveDown={(i) => moveUnitDown(null, i)}
            />
            {addingUnitToSection === '__unsectioned__' && (
              <AddUnitForm
                newUnit={newUnit}
                setNewUnit={setNewUnit}
                onSave={() => handleAddUnit(null)}
                onCancel={() => {
                  setAddingUnitToSection(null);
                  setNewUnit({ name: '', type: 'text', content: '' });
                }}
                saving={saving}
              />
            )}
          </div>
        )}

        {/* Sections */}
        {sortedSections.map((section, sectionIndex) => {
          const sectionUnits = getUnitsForSection(section.id);
          const isEditing = editingSectionId === section.id;

          return (
            <div
              key={section.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />

                {isEditing ? (
                  <input
                    type="text"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    className="flex-1 px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateSection(section.id);
                      if (e.key === 'Escape') setEditingSectionId(null);
                    }}
                  />
                ) : (
                  <h3 className="flex-1 font-medium text-slate-700">{section.name}</h3>
                )}

                <span className="text-xs text-slate-500 mr-2">{sectionUnits.length} units</span>

                {isEditing ? (
                  <>
                    <button
                      onClick={() => handleUpdateSection(section.id)}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                      disabled={saving}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingSectionId(null)}
                      className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => moveSectionUp(sectionIndex)}
                      className="p-1 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30"
                      disabled={sectionIndex === 0}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveSectionDown(sectionIndex)}
                      className="p-1 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30"
                      disabled={sectionIndex === sortedSections.length - 1}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingSectionId(section.id);
                        setNewSectionName(section.name);
                      }}
                      className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSection(section.id)}
                      className="p-1 text-red-500 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setAddingUnitToSection(section.id)}
                      className="ml-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Unit
                    </button>
                  </>
                )}
              </div>

              {sectionUnits.length === 0 && addingUnitToSection !== section.id && (
                <div className="px-4 py-6 text-center text-slate-400 text-sm">
                  No units in this section
                </div>
              )}

              <UnitList
                units={sectionUnits}
                sectionId={section.id}
                onEdit={setEditingUnit}
                onDelete={handleDeleteUnit}
                onMoveUp={(i) => moveUnitUp(section.id, i)}
                onMoveDown={(i) => moveUnitDown(section.id, i)}
              />

              {addingUnitToSection === section.id && (
                <AddUnitForm
                  newUnit={newUnit}
                  setNewUnit={setNewUnit}
                  onSave={() => handleAddUnit(section.id)}
                  onCancel={() => {
                    setAddingUnitToSection(null);
                    setNewUnit({ name: '', type: 'text', content: '' });
                  }}
                  saving={saving}
                />
              )}
            </div>
          );
        })}

        {/* Add Section */}
        {showAddSection ? (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={addingSectionName}
                onChange={(e) => setAddingSectionName(e.target.value)}
                placeholder="Section name"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSection();
                  if (e.key === 'Escape') {
                    setShowAddSection(false);
                    setAddingSectionName('');
                  }
                }}
              />
              <button
                onClick={handleAddSection}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={saving || !addingSectionName.trim()}
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setShowAddSection(false);
                  setAddingSectionName('');
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddSection(true)}
            className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Section
          </button>
        )}

        {/* Add unsectioned unit when no sections exist */}
        {sections.length === 0 && unsectionedUnits.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Start Building Your Course</h3>
            <p className="text-slate-500 mb-4">
              Add sections to organize your content, or add units directly.
            </p>
            <button
              onClick={() => setAddingUnitToSection('__unsectioned__')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add First Unit
            </button>
          </div>
        )}
      </div>

      {/* Edit Unit Modal */}
      {editingUnit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Edit Unit</h2>
              <button
                onClick={() => setEditingUnit(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit Name</label>
                <input
                  type="text"
                  value={editingUnit.name}
                  onChange={(e) => setEditingUnit({ ...editingUnit, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {unitTypes.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setEditingUnit({ ...editingUnit, type: t.value })}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
                        editingUnit.type === t.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {editingUnit.type === 'video' ? 'Video URL (YouTube/Vimeo)' : 'Content'}
                </label>
                {editingUnit.type === 'video' || editingUnit.type === 'link' ? (
                  <input
                    type="url"
                    value={editingUnit.content || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, content: e.target.value })}
                    placeholder={
                      editingUnit.type === 'video'
                        ? 'https://youtube.com/watch?v=... or https://vimeo.com/...'
                        : 'https://...'
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <textarea
                    value={editingUnit.content || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, content: e.target.value })}
                    rows={8}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={
                      editingUnit.type === 'text'
                        ? 'Enter your text content here...'
                        : editingUnit.type === 'document'
                          ? 'Enter document URL or embed code...'
                          : ''
                    }
                  />
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setEditingUnit(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUnit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
              >
                <Save className="w-4 h-4 inline mr-2" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Unit List Component
function UnitList({
  units,
  sectionId,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  units: Unit[];
  sectionId: string | null;
  onEdit: (unit: Unit) => void;
  onDelete: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}) {
  if (units.length === 0) return null;

  return (
    <ul className="divide-y divide-slate-100">
      {units.map((unit, index) => {
        const typeInfo = getUnitTypeInfo(unit.type);
        return (
          <li
            key={unit.id}
            className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 group"
          >
            <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
            <span className={cn('p-2 rounded-lg', typeInfo.color)}>
              <typeInfo.icon className="w-4 h-4" />
            </span>
            <span className="flex-1 text-slate-700">{unit.name}</span>
            <span className="text-xs text-slate-400 capitalize">{unit.type}</span>
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
              <button
                onClick={() => onMoveUp(index)}
                className="p-1 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30"
                disabled={index === 0}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => onMoveDown(index)}
                className="p-1 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30"
                disabled={index === units.length - 1}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => onEdit(unit)}
                className="p-1 text-slate-500 hover:bg-slate-100 rounded"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(unit.id)}
                className="p-1 text-red-500 hover:bg-red-100 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Add Unit Form Component
function AddUnitForm({
  newUnit,
  setNewUnit,
  onSave,
  onCancel,
  saving,
}: {
  newUnit: { name: string; type: Unit['type']; content: string };
  setNewUnit: (unit: { name: string; type: Unit['type']; content: string }) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="p-4 bg-slate-50 border-t border-slate-200">
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newUnit.name}
            onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
            placeholder="Unit name"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newUnit.name.trim()) onSave();
              if (e.key === 'Escape') onCancel();
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {unitTypes.map((t) => (
            <button
              key={t.value}
              onClick={() => setNewUnit({ ...newUnit, type: t.value })}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm border transition-colors',
                newUnit.type === t.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:bg-white'
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
        {(newUnit.type === 'video' || newUnit.type === 'link') && (
          <input
            type="url"
            value={newUnit.content}
            onChange={(e) => setNewUnit({ ...newUnit, content: e.target.value })}
            placeholder={
              newUnit.type === 'video' ? 'Video URL (YouTube/Vimeo)' : 'URL'
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-white text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
            disabled={saving || !newUnit.name.trim()}
          >
            Add Unit
          </button>
        </div>
      </div>
    </div>
  );
}
