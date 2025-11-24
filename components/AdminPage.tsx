import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { api, ApiProjectType } from '../services/api';

interface AdminPageProps {
  onClose: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onClose }) => {
  const [projectTypes, setProjectTypes] = useState<ApiProjectType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    loadProjectTypes();
  }, []);

  const loadProjectTypes = async () => {
    setIsLoading(true);
    try {
      const { projectTypes: types } = await api.getProjectTypes();
      setProjectTypes(types);
    } catch (error) {
      console.error('Failed to load project types', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTypeName.trim()) return;
    setIsCreating(true);
    try {
      await api.createProjectType(newTypeName.trim());
      setNewTypeName('');
      await loadProjectTypes();
    } catch (error) {
      console.error('Failed to create project type', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (type: ApiProjectType) => {
    setEditingId(type.id);
    setEditingName(type.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      await api.updateProjectType(id, editingName.trim());
      setEditingId(null);
      setEditingName('');
      await loadProjectTypes();
    } catch (error) {
      console.error('Failed to update project type', error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Удалить тип проекта "${name}"?`)) return;
    try {
      await api.deleteProjectType(id);
      await loadProjectTypes();
    } catch (error: any) {
      alert(error?.message || 'Не удалось удалить тип проекта');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gradient-to-b from-black/90 via-black/80 to-black/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
          <h1 className="text-2xl font-bold text-white">Управление типами проектов</h1>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Create Form */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Название типа проекта"
              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-transparent"
            />
            <button
              onClick={handleCreate}
              disabled={isCreating || !newTypeName.trim()}
              className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Создать
            </button>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {projectTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                >
                  {editingId === type.id ? (
                    <>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(type.id)}
                        className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(type.id)}
                        className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        Сохранить
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingName('');
                        }}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
                      >
                        Отмена
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-white font-medium">{type.name}</span>
                      <button
                        onClick={() => handleStartEdit(type)}
                        className="p-2 rounded-lg text-white/60 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                        title="Редактировать"
                      >
                        <Edit2 size={16} />
                      </button>
                      {type.id !== 'default' && (
                        <button
                          onClick={() => handleDelete(type.id, type.name)}
                          className="p-2 rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
