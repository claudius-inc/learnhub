'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react';
import { GroupModal } from '@/components/GroupModal';

type Group = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  user_count: number;
};

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/groups?${params}`);
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGroups();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchGroups]);

  const handleDelete = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group? Users in this group will have no group assigned.')) return;

    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchGroups();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete group');
      }
    } catch {
      alert('Failed to delete group');
    }
    setOpenDropdown(null);
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setModalOpen(true);
    setOpenDropdown(null);
  };

  const handleAddGroup = () => {
    setEditingGroup(null);
    setModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Groups</h1>
          <p className="text-slate-500 mt-1">Organize users into groups for easier management</p>
        </div>
        <button
          onClick={handleAddGroup}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Group
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">No groups yet</h3>
          <p className="text-slate-500 mb-4">Create your first group to organize users</p>
          <button
            onClick={handleAddGroup}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{group.name}</h3>
                  {group.description && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{group.description}</p>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === group.id ? null : group.id)}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  {openDropdown === group.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenDropdown(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 z-20 py-1">
                        <button
                          onClick={() => handleEdit(group)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(group.id)}
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
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">
                  {group.user_count} {group.user_count === 1 ? 'user' : 'users'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Group Modal */}
      <GroupModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        group={editingGroup}
        onSave={fetchGroups}
      />
    </div>
  );
}
