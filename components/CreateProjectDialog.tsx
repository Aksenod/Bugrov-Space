import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api, ApiProjectType } from '../services/api';
import { ProjectType } from '../types';

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, projectTypeId: string, description?: string) => Promise<void>;
  projectTypes?: ProjectType[]; // Передаем типы проектов из родителя для ускорения
}

export const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({
  isOpen,
  onClose,
  onCreate,
  projectTypes: initialProjectTypes = [],
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectTypeId, setProjectTypeId] = useState('');
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>(initialProjectTypes);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const isOpenRef = useRef(isOpen);

  // Обновляем ref при изменении isOpen
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (isOpen) {
      // Если типы проектов уже переданы из родителя - используем их, иначе загружаем
      if (initialProjectTypes.length > 0) {
        setProjectTypes(initialProjectTypes);
        setIsLoadingTypes(false);
        // Автоматически выбираем первый тип, если ничего не выбрано
        if (!projectTypeId && initialProjectTypes.length > 0) {
          setProjectTypeId(initialProjectTypes[0].id);
        }
      } else {
        // Загружаем типы проектов только если они не переданы
        loadProjectTypes();
      }
    } else {
      // Сброс формы при закрытии
      setName('');
      setDescription('');
      setProjectTypeId('');
      setError(null);
      setProjectTypes([]);
      setIsLoadingTypes(false);
      // Отменяем любые активные запросы
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }

    return () => {
      // Cleanup: отменяем запросы при закрытии диалога или размонтировании
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      isMountedRef.current = false;
    };
  }, [isOpen]);
  
  // Обновляем типы проектов при изменении пропса
  useEffect(() => {
    if (initialProjectTypes.length > 0) {
      setProjectTypes(initialProjectTypes);
      if (!projectTypeId && initialProjectTypes.length > 0) {
        setProjectTypeId(initialProjectTypes[0].id);
      }
    }
  }, [initialProjectTypes]);

  const loadProjectTypes = async () => {
    // Проверяем, что диалог еще открыт перед началом загрузки
    if (!isOpenRef.current || !isMountedRef.current) {
      return;
    }

    // Отменяем предыдущий запрос, если он еще активен
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Создаем новый AbortController для этого запроса
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Проверяем еще раз перед установкой состояния загрузки
      if (!isMountedRef.current || !isOpenRef.current) {
        return;
      }
      setIsLoadingTypes(true);
      
      const { projectTypes: apiTypes } = await api.getProjectTypes();
      
      // Проверяем, что запрос не был отменен и компонент еще открыт
      if (abortController.signal.aborted || !isMountedRef.current || !isOpenRef.current) {
        return;
      }

      const mappedTypes = apiTypes.map((t: ApiProjectType) => ({
        id: t.id,
        name: t.name,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));
      
      // Проверяем еще раз перед обновлением состояния (критично!)
      if (!abortController.signal.aborted && isMountedRef.current && isOpenRef.current) {
        setProjectTypes(mappedTypes);
        // Автоматически выбираем первый тип, если он есть и ничего не выбрано
        // Используем функциональную форму setState для безопасности
        if (mappedTypes.length > 0) {
          setProjectTypeId((prev) => {
            // Дополнительная проверка перед установкой значения
            if (!isMountedRef.current || !isOpenRef.current) {
              return prev; // Не обновляем, если диалог закрыт
            }
            return prev || mappedTypes[0].id;
          });
        }
      }
    } catch (err: any) {
      // Игнорируем ошибки отмены запроса
      if (err.name === 'AbortError' || abortController.signal.aborted) {
        return;
      }
      
      // Проверяем, что компонент еще открыт перед показом ошибки
      if (isMountedRef.current && isOpenRef.current && abortControllerRef.current === abortController) {
        setError(err.message || 'Ошибка при загрузке типов проектов');
        console.error('Failed to load project types', err);
      }
    } finally {
      // Обновляем состояние загрузки только если запрос не был отменен и диалог открыт
      if (!abortController.signal.aborted && isMountedRef.current && isOpenRef.current && abortControllerRef.current === abortController) {
        setIsLoadingTypes(false);
      }
      
      // Очищаем ссылку на AbortController, если это был текущий запрос
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  };

  if (!isOpen) return null;

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

    if (!projectTypeId) {
      setError('Тип проекта обязателен');
      return;
    }

    if (description && description.length > 500) {
      setError('Описание не может быть длиннее 500 символов');
      return;
    }

    try {
      setIsLoading(true);
      await onCreate(name.trim(), projectTypeId, description.trim() || undefined);
      setName('');
      setDescription('');
      setProjectTypeId('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании проекта');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName('');
      setDescription('');
      setProjectTypeId('');
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-md mx-4 bg-gradient-to-b from-black/90 via-black/80 to-black/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Создать проект</h2>
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
            <label htmlFor="projectType" className="block text-sm font-semibold text-white/90 mb-2">
              Тип проекта <span className="text-red-400">*</span>
            </label>
            {isLoadingTypes ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={20} className="animate-spin text-indigo-400" />
              </div>
            ) : (
              <select
                id="projectType"
                value={projectTypeId}
                onChange={(e) => setProjectTypeId(e.target.value)}
                disabled={isLoading || projectTypes.length === 0}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer [&>option]:bg-black [&>option]:text-white"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 1rem center',
                  paddingRight: '2.5rem',
                }}
              >
                {projectTypes.length === 0 ? (
                  <option value="">Типы проектов не загружены</option>
                ) : (
                  <>
                    {!projectTypeId && (
                      <option value="" disabled>
                        Выберите тип проекта
                      </option>
                    )}
                    {projectTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            )}
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

          <div className="flex gap-3 pt-4">
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
              disabled={isLoading || !name.trim() || !projectTypeId || isLoadingTypes}
              className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

