import React from 'react';
import { FileText, X, Upload, ChevronLeft } from 'lucide-react';
import { UploadedFile, Project } from '../../types';
import { getDocumentDisplayName } from './helpers';

interface DocumentsSidebarProps {
  documents: UploadedFile[];
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
  project?: Project | null;
  onClose: () => void;
  onFileUpload?: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const DocumentsSidebar: React.FC<DocumentsSidebarProps> = ({
  documents,
  selectedFileId,
  onSelectFile,
  project,
  onClose,
  onFileUpload,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  return (
    <div 
      className={`border-r border-white/10 flex flex-col bg-black/40 backdrop-blur-xl transition-all duration-300 ease-in-out relative overflow-hidden ${
        isSidebarCollapsed 
          ? 'w-[60px] md:!w-[60px]' 
          : 'w-full md:!w-[280px] md:min-w-[280px]'
      } ${selectedFileId ? 'hidden md:flex' : 'flex'}`}
      title={isSidebarCollapsed ? `${documents.length} ${documents.length === 1 ? 'документ' : documents.length < 5 ? 'документа' : 'документов'}` : undefined}
      style={{ 
        transitionProperty: 'width',
        transitionDuration: '300ms',
        transitionTimingFunction: 'ease-in-out',
        willChange: 'width'
      }}
    >
      <div className={`transition-all duration-300 ease-in-out border-b border-white/10 flex flex-col ${
        isSidebarCollapsed ? 'p-0 items-center gap-0' : 'p-4 sm:p-6 gap-2'
      }`}>
        {/* Expanded Header */}
        <div 
          className={`transition-opacity duration-300 ease-in-out flex items-center gap-2 ${
            isSidebarCollapsed 
              ? 'opacity-0 pointer-events-none max-h-0 overflow-hidden' 
              : 'opacity-100 pointer-events-auto'
          }`}
          style={{
            maxHeight: isSidebarCollapsed ? '0px' : 'none',
            transitionProperty: isSidebarCollapsed ? 'opacity, max-height' : 'opacity',
            transitionDuration: '300ms',
            transitionTimingFunction: 'ease-in-out'
          }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-amber-500/20 rounded-xl text-amber-400 flex-shrink-0">
                <FileText size={18} className="sm:w-5 sm:h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                {project?.name || 'Документы'}
              </h2>
            </div>
            {project?.projectType && (
              <p className="text-xs sm:text-sm text-white/50 mt-1 ml-11 sm:ml-12 truncate">
                {project.projectType.name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
          <button
            onClick={onToggleSidebar}
            className="hidden md:flex p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 flex-shrink-0"
            aria-label="Свернуть панель документов"
            title="Свернуть панель"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Collapsed Header */}
        <div 
          className={`flex flex-col items-center ${
            isSidebarCollapsed 
              ? 'opacity-100 pointer-events-auto overflow-visible pt-[30px]' 
              : 'opacity-0 pointer-events-none max-h-0 overflow-hidden'
          }`}
          style={{
            maxWidth: isSidebarCollapsed ? '60px' : '0px',
            maxHeight: isSidebarCollapsed ? 'none' : '0px',
            transitionProperty: isSidebarCollapsed ? 'opacity, max-width' : 'opacity, max-width, max-height',
            transitionDuration: isSidebarCollapsed ? '300ms' : '0ms',
            transitionTimingFunction: 'ease-in-out'
          }}
        >
          <button
            onClick={onToggleSidebar}
            className="relative p-2.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-xl text-amber-400 transition-colors duration-200 group w-full flex items-center justify-center flex-shrink-0 mt-0"
            aria-label="Развернуть панель документов"
            title={`${documents.length} ${documents.length === 1 ? 'документ' : documents.length < 5 ? 'документа' : 'документов'}`}
          >
            <FileText size={22} className="group-hover:scale-110 transition-transform duration-200" />
            {documents.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-indigo-500 text-white text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 shadow-lg ring-2 ring-black/60">
                {documents.length > 9 ? '9+' : documents.length}
              </span>
            )}
          </button>
          
          {onFileUpload && (
            <button
              onClick={onFileUpload}
              className="w-full p-2.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors duration-200 flex items-center justify-center border border-indigo-500/20 hover:border-indigo-500/40 flex-shrink-0 mt-3"
              aria-label="Загрузить документ"
              title="Загрузить документ"
            >
              <Upload size={18} />
            </button>
          )}
        </div>

        {/* Upload Button (Expanded State) */}
        {onFileUpload && (
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isSidebarCollapsed 
                ? 'opacity-0 max-h-0 mt-0 pointer-events-none' 
                : 'opacity-100 max-h-20 -mt-1 pointer-events-auto'
            }`}
            style={{ 
              transitionProperty: 'opacity, max-height, margin-top',
              willChange: isSidebarCollapsed ? 'opacity, max-height' : undefined
            }}
          >
            <button
              onClick={onFileUpload}
              className="w-full px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
            >
              <Upload size={16} />
              Загрузить
            </button>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div 
        className={`flex-1 overflow-hidden transition-opacity duration-300 ease-in-out ${
          isSidebarCollapsed 
            ? 'opacity-0 pointer-events-none' 
            : 'opacity-100 pointer-events-auto'
        }`}
      >
        <div className="h-full overflow-y-auto p-4 space-y-2 md:no-scrollbar">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-white/40 text-center p-6 border-2 border-dashed border-white/10 rounded-3xl m-4">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full animate-pulse"></div>
                <FileText size={40} className="relative opacity-60" />
              </div>
              <p className="text-base font-semibold text-white/70 mb-2">Нет документов</p>
              <p className="text-xs text-white/50 max-w-[200px]">Используйте кнопку "Сохранить" в чате для создания отчетов.</p>
            </div>
          ) : (
            documents.map(doc => (
              <button
                key={doc.id}
                onClick={() => onSelectFile(doc.id)}
                className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-4 group relative overflow-hidden ${selectedFileId === doc.id
                  ? 'bg-white/10 shadow-lg border border-white/10'
                  : 'hover:bg-white/5 border border-transparent'
                  }`}
              >
                {selectedFileId === doc.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400"></div>}
                <div className="min-w-0 flex-1">
                  <h4 className={`text-sm font-semibold line-clamp-2 ${selectedFileId === doc.id ? 'text-white' : 'text-white/70'}`}>
                    {getDocumentDisplayName(doc)}
                  </h4>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};


