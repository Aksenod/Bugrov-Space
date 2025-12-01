import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';

const FILE_SIZE_LIMIT = 2 * 1024 * 1024; // 2MB

// Supported file types (no images)
const ACCEPTED_FILE_TYPES = {
  // Documents
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],

  // Code files
  'text/html': ['.html'],
  'text/css': ['.css'],
  'text/javascript': ['.js'],
  'application/json': ['.json'],
  'text/xml': ['.xml'],
  'application/typescript': ['.ts', '.tsx'],
  'text/x-python': ['.py'],
  'text/x-java': ['.java'],
  'text/x-c': ['.c', '.h'],
  'text/x-c++': ['.cpp', '.hpp'],
  'text/x-csharp': ['.cs'],
  'text/x-go': ['.go'],
  'text/x-rust': ['.rs'],
  'text/x-php': ['.php'],
  'text/x-ruby': ['.rb'],
  'text/x-swift': ['.swift'],
  'text/x-kotlin': ['.kt'],
  'application/x-yaml': ['.yaml', '.yml'],
};

const getAllowedExtensions = () => {
  return Object.values(ACCEPTED_FILE_TYPES).flat().join(', ');
};

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: FileList) => void;
  isUploading?: boolean;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  isUploading = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validateFiles = (files: FileList): boolean => {
    setError(null);

    if (files.length === 0) {
      setError('Пожалуйста, выберите хотя бы один файл');
      return false;
    }

    // Check file sizes and types
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check file size
      if (file.size > FILE_SIZE_LIMIT) {
        setError(`Файл "${file.name}" превышает максимальный размер 2MB`);
        return false;
      }

      // Check file extension
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = Object.values(ACCEPTED_FILE_TYPES).flat();

      if (!allowedExtensions.includes(extension)) {
        setError(`Файл "${file.name}" имеет неподдерживаемый формат. Изображения не поддерживаются.`);
        return false;
      }
    }

    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = e.dataTransfer.files;
      if (validateFiles(files)) {
        onUpload(files);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = e.target.files;
      if (validateFiles(files)) {
        onUpload(files);
      }
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleClose = () => {
    if (!isUploading) {
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950/30 rounded-3xl shadow-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
              <Upload size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Загрузить документы</h2>
              <p className="text-sm text-white/50 mt-0.5">Добавьте файлы в проект</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Закрыть"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
              dragActive
                ? 'border-indigo-400 bg-indigo-500/10'
                : 'border-white/20 hover:border-white/30 hover:bg-white/5'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={!isUploading ? handleBrowseClick : undefined}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={getAllowedExtensions()}
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />

            <div className="flex flex-col items-center gap-4">
              {isUploading ? (
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
                  <Loader2 size={48} className="relative text-indigo-400 animate-spin" />
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full"></div>
                  <FileText size={48} className="relative text-indigo-400" />
                </div>
              )}

              <div>
                <p className="text-lg font-semibold text-white mb-1">
                  {isUploading ? 'Загрузка...' : 'Перетащите файлы сюда'}
                </p>
                <p className="text-sm text-white/50">
                  {isUploading ? 'Пожалуйста, подождите' : 'или нажмите, чтобы выбрать файлы'}
                </p>
              </div>

              {!isUploading && (
                <button
                  onClick={handleBrowseClick}
                  className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors"
                >
                  Выбрать файлы
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl">
            <h3 className="text-sm font-semibold text-white mb-2">Поддерживаемые форматы:</h3>
            <ul className="text-xs text-white/60 space-y-1">
              <li>📄 Документы: TXT, MD, PDF, DOC, DOCX</li>
              <li>💻 Код: HTML, CSS, JS, TS, JSON, Python, Java, C++, и другие</li>
              <li>⚠️ Максимальный размер файла: 2MB</li>
              <li>🚫 Изображения не поддерживаются</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
