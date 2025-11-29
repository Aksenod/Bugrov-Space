import React, { useState, useRef } from 'react';
import { X, Upload, File, AlertCircle, CheckCircle, Loader2, FileText, Image as ImageIcon } from 'lucide-react';

const FILE_SIZE_LIMIT = 2 * 1024 * 1024; // 2 MB

// Поддерживаемые MIME типы
const SUPPORTED_MIME_TYPES = [
  // Текст
  'text/plain',
  'text/markdown',
  // Документы
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Изображения
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/svg+xml',
  'image/webp',
  // Код
  'text/javascript',
  'text/html',
  'text/css',
  'application/json',
  'application/xml',
  'text/xml',
  // Другие
  'text/csv',
  'application/x-yaml',
  'text/yaml',
];

// Расширения файлов
const SUPPORTED_EXTENSIONS = [
  '.txt', '.md', '.markdown',
  '.pdf', '.doc', '.docx',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
  '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.json', '.xml',
  '.csv', '.yaml', '.yml'
];

interface FileWithStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  progress?: number;
}

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => Promise<void>;
  projectName?: string;
}

const readFileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  projectName = 'проект',
}) => {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validateFile = (file: File): string | null => {
    // Проверка размера
    if (file.size > FILE_SIZE_LIMIT) {
      return `Файл слишком большой (максимум ${FILE_SIZE_LIMIT / 1024 / 1024} МБ)`;
    }

    // Проверка типа
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidExtension = SUPPORTED_EXTENSIONS.includes(extension);
    const isValidMimeType = SUPPORTED_MIME_TYPES.includes(file.type);

    if (!isValidExtension && !isValidMimeType) {
      return `Неподдерживаемый формат файла (${extension})`;
    }

    return null;
  };

  const handleFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const filesWithStatus: FileWithStatus[] = fileArray.map(file => {
      const error = validateFile(file);
      return {
        file,
        status: error ? 'error' as const : 'pending' as const,
        error: error || undefined,
      };
    });

    setFiles(prev => [...prev, ...filesWithStatus]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    const validFiles = files.filter(f => f.status === 'pending');
    if (validFiles.length === 0) return;

    setIsUploading(true);

    // Отмечаем файлы как загружаемые
    setFiles(prev => prev.map(f =>
      f.status === 'pending' ? { ...f, status: 'uploading' as const, progress: 0 } : f
    ));

    try {
      // Загружаем файлы
      const filesToUpload = validFiles.map(f => f.file);
      await onUpload(filesToUpload);

      // Отмечаем файлы как успешно загруженные
      setFiles(prev => prev.map(f =>
        f.status === 'uploading' ? { ...f, status: 'success' as const, progress: 100 } : f
      ));

      // Закрываем модалку через 1 секунду
      setTimeout(() => {
        onClose();
        setFiles([]);
      }, 1000);
    } catch (error: any) {
      // Отмечаем файлы как ошибочные
      setFiles(prev => prev.map(f =>
        f.status === 'uploading' ? { ...f, status: 'error' as const, error: error.message || 'Ошибка загрузки' } : f
      ));
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon size={20} className="text-purple-400" />;
    }
    return <FileText size={20} className="text-blue-400" />;
  };

  const getStatusIcon = (status: FileWithStatus['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 size={16} className="text-blue-400 animate-spin" />;
      case 'success':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-400" />;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const canUpload = pendingCount > 0 && !isUploading;

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 via-black to-indigo-950/30 rounded-3xl border border-white/10 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                <Upload size={20} />
              </div>
              Загрузить документы
            </h2>
            <p className="text-sm text-white/50 mt-1">в проект "{projectName}"</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-400 bg-indigo-500/10'
                : 'border-white/20 hover:border-white/40 hover:bg-white/5'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`p-4 rounded-full transition-colors ${
                isDragging ? 'bg-indigo-500/20' : 'bg-white/5'
              }`}>
                <Upload size={32} className={isDragging ? 'text-indigo-400' : 'text-white/40'} />
              </div>
              <div>
                <p className="text-white font-medium mb-1">
                  Перетащите файлы сюда или нажмите для выбора
                </p>
                <p className="text-sm text-white/50">
                  Максимальный размер: 2 МБ
                </p>
                <p className="text-xs text-white/30 mt-2">
                  Поддерживаемые форматы: txt, md, pdf, doc, docx, png, jpg, svg, js, ts, html, css, json, yaml и др.
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
              accept={SUPPORTED_EXTENSIONS.join(',')}
            />
          </div>

          {/* Files List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <File size={16} />
                Выбранные файлы ({files.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((fileWithStatus, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-xl border flex items-center gap-3 ${
                      fileWithStatus.status === 'error'
                        ? 'bg-red-500/10 border-red-500/30'
                        : fileWithStatus.status === 'success'
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    {getFileIcon(fileWithStatus.file)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {fileWithStatus.file.name}
                      </p>
                      <p className="text-xs text-white/50">
                        {formatFileSize(fileWithStatus.file.size)}
                      </p>
                      {fileWithStatus.error && (
                        <p className="text-xs text-red-400 mt-1">
                          {fileWithStatus.error}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(fileWithStatus.status)}
                      {fileWithStatus.status !== 'uploading' && fileWithStatus.status !== 'success' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(index);
                          }}
                          className="p-1 text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors"
                          aria-label="Удалить"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex items-center justify-between flex-shrink-0">
          <p className="text-sm text-white/50">
            {pendingCount > 0 && `Готово к загрузке: ${pendingCount} ${pendingCount === 1 ? 'файл' : 'файлов'}`}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleUpload}
              disabled={!canUpload}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 disabled:text-white/30 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Загрузить {pendingCount > 0 ? `(${pendingCount})` : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
