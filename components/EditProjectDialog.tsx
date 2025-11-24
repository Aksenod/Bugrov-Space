import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Project } from '../types';

interface EditProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (name: string, description?: string) => Promise<void>;
  onDelete?: () => void;
  project: Project | null;
}

export const EditProjectDialog: React.FC<EditProjectDialogProps> = ({
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  project,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project && isOpen) {
      setName(project.name || '');
      setDescription(project.description || '');
      setError(null);
    }
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Название проекта обязательно');
      return;
    }

    if (name.length > 50) {
      setError('Название проекта не может быть длиннее 50 символов');
      return;
    }

    if (description && description.length > 500) {
      setError('Описание не может быть длиннее 500 символов');
      return;
    }

    try {
      setIsLoading(true);
      await onUpdate(name.trim(), description.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка при обновлении проекта');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-md mx-4 bg-gradient-to-b from-black/90 via-black/80 to-black/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Редактировать проект</h2>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-white/90 mb-2">
              Название проекта <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название проекта"
              maxLength={50}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              autoFocus
            />
            <p className="mt-1 text-xs text-white/40">{name.length}/50</p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-white/90 mb-2">
              Описание (необязательно)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Введите описание проекта"
              maxLength={500}
              rows={3}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
            <p className="mt-1 text-xs text-white/40">{description.length}/500</p>
          </div>

          <div className="space-y-3 pt-4">
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (!isLoading && onDelete) {
                    onDelete();
                  }
                }}
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Удалить проект
              </button>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

