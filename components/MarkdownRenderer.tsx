import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Динамический импорт для оптимизации - загружается только при необходимости
let SyntaxHighlighter: any = null;
let vscDarkPlus: any = null;

const loadSyntaxHighlighter = async () => {
  if (!SyntaxHighlighter) {
    const module = await import('react-syntax-highlighter');
    SyntaxHighlighter = module.Prism;
  }
  if (!vscDarkPlus) {
    const styleModule = await import('react-syntax-highlighter/dist/esm/styles/prism');
    vscDarkPlus = styleModule.vscDarkPlus;
  }
  return { SyntaxHighlighter, vscDarkPlus };
};

// Компонент-обертка для SyntaxHighlighter с динамической загрузкой
const SyntaxHighlighterWrapper: React.FC<{ language: string; children: string;[key: string]: any }> = ({ language, children, ...props }) => {
  const [isReady, setIsReady] = React.useState(false);
  const [highlighter, setHighlighter] = React.useState<any>(null);

  React.useEffect(() => {
    let mounted = true;

    loadSyntaxHighlighter().then(({ SyntaxHighlighter: SH, vscDarkPlus: style }) => {
      if (mounted) {
        setHighlighter({ Component: SH, style });
        setIsReady(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!isReady || !highlighter) {
    return (
      <div className="bg-slate-800/80 p-3 rounded border border-slate-700/50">
        <code className="text-amber-200 font-mono text-sm whitespace-pre-wrap">
          {children}
        </code>
      </div>
    );
  }

  const { Component, style } = highlighter;
  return (
    <Component
      style={{
        ...style,
        margin: 0,
        padding: '1.5rem',
        overflow: 'visible',
      }}
      language={language}
      PreTag="div"
      customStyle={{
        overflow: 'visible',
        margin: 0,
      }}
      {...props}
    >
      {children}
    </Component>
  );
};

interface MarkdownRendererProps {
  content: string;
  isCompact?: boolean;
}

// Функция для добавления стилей, убирающих пустые пространства в iframe
const enhanceHtmlForIframe = (html: string): string => {
  const noSpacingStyles = `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: auto;
      }
      body {
        display: block;
        padding: 12px;
      }
    </style>
  `;

  const hasHeadTag = html.includes('<head') || html.includes('<HEAD');
  const hasHtmlTag = html.includes('<html') || html.includes('<HTML');

  if (hasHeadTag) {
    if (html.includes('</head>')) {
      return html.replace('</head>', `${noSpacingStyles}</head>`);
    } else if (html.includes('</HEAD>')) {
      return html.replace('</HEAD>', `${noSpacingStyles}</HEAD>`);
    } else {
      return html.replace(/(<head[^>]*>)/i, `$1${noSpacingStyles}`);
    }
  } else if (hasHtmlTag) {
    return html.replace(/(<html[^>]*>)/i, `$1<head>${noSpacingStyles}</head>`);
  } else {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${noSpacingStyles}
</head>
<body>
${html}
</body>
</html>`;
  }
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isCompact = false }) => {
  // Настройки отступов в зависимости от режима
  const spacing = isCompact ? {
    paragraph: '0.75rem',      // 12px
    list: '0.75rem',            // 12px
    listItem: '0.375rem',       // 6px
    heading: '0.75rem',         // 12px
    blockquote: '0.75rem',      // 12px
    lineHeight: '1.4',
  } : {
    paragraph: '0.875rem',      // 14px
    list: '0.875rem',           // 14px
    listItem: '0.5rem',         // 8px
    heading: '1rem',            // 16px
    blockquote: '0.875rem',     // 14px
    lineHeight: '1.5',
  };

  const [htmlPreviews, setHtmlPreviews] = React.useState<{ [key: string]: boolean }>({});

  // Простая функция для создания хеша строки
  const hashString = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  };

  // Преобразует текст с тире в markdown список для лучшей читаемости
  // ВАЖНО: Убрано автоматическое преобразование тире в списки - это создавало лишние буллеты
  // Теперь функция только нормализует уже существующие markdown списки
  const normalizeListContent = (text: string): string => {
    const lines = text.split('\n');
    const normalizedLines: string[] = [];
    let inList = false;
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Проверяем, является ли строка разделителем таблицы (--- или :---: и т.д.)
      const isTableSeparator = /^[\s|:\-]+$/.test(trimmedLine) && trimmedLine.includes('|');
      
      // Проверяем, является ли строка частью таблицы (содержит разделители |)
      const isTableRow = trimmedLine.includes('|') && trimmedLine.split('|').length >= 2;
      
      // Если это разделитель таблицы, мы точно в таблице
      if (isTableSeparator) {
        inTable = true;
        normalizedLines.push(line);
        continue;
      }
      
      // Если это строка таблицы, проверяем контекст
      if (isTableRow) {
        // Проверяем, была ли предыдущая строка частью таблицы или разделителем
        const prevLine = i > 0 ? lines[i - 1].trim() : '';
        const prevIsTableRow = prevLine.includes('|') && prevLine.split('|').length >= 2;
        const prevIsSeparator = /^[\s|:\-]+$/.test(prevLine) && prevLine.includes('|');
        
        // Если предыдущая строка была частью таблицы или разделителем, продолжаем таблицу
        if (prevIsTableRow || prevIsSeparator || inTable) {
          inTable = true;
          normalizedLines.push(line);
          continue;
        }
        
        // Проверяем следующую строку - если это разделитель, начинаем таблицу
        const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
        const nextIsSeparator = /^[\s|:\-]+$/.test(nextLine) && nextLine.includes('|');
        if (nextIsSeparator) {
          inTable = true;
          normalizedLines.push(line);
          continue;
        }
      }
      
      // Если мы были в таблице и встретили строку без | (не разделитель), выходим из таблицы
      // Пустая строка также завершает таблицу
      if (inTable && !isTableRow) {
        inTable = false;
      }
      
      // Если мы в таблице, не обрабатываем строку как список
      if (inTable) {
        normalizedLines.push(line);
        continue;
      }
      
      // УБРАНО: Автоматическое преобразование тире в списки
      // Это создавало лишние буллеты для обычного текста с тире
      // Теперь обрабатываем только уже существующие markdown списки
      
      // Проверяем, является ли строка уже markdown списком
      const isAlreadyMarkdownList = /^[-*+]\s/.test(trimmedLine) || /^\d+\.\s/.test(trimmedLine);
      
      // Обрабатываем только уже существующие markdown списки
      if (isAlreadyMarkdownList) {
        // Если мы были в списке и встретили markdown список, продолжаем список
        if (!inList && i > 0 && normalizedLines[normalizedLines.length - 1]?.trim() !== '') {
          normalizedLines.push('');
        }
        normalizedLines.push(line);
        inList = true;
      } else {
        // Если мы были в списке и встретили не-элемент списка
        if (inList && trimmedLine !== '') {
          // Добавляем пустую строку после списка
          normalizedLines.push('');
          inList = false;
        }
        normalizedLines.push(line);
        if (trimmedLine === '') {
          inList = false;
        }
      }
    }

    const result = normalizedLines.join('\n');
    return result;
  };

  const normalizedContent = normalizeListContent(content);

  return (
    <div
      className="max-w-none break-words py-0 w-full text-white/95 [&>*:first-child]:!mt-0 [&>*:last-child]:!mb-0"
      style={{ 
        marginTop: 0, 
        marginBottom: 0, 
        paddingTop: 0, 
        paddingBottom: 0, 
        minWidth: 0,
        counterReset: 'ordered-list-counter',
        lineHeight: spacing.lineHeight,
      }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeContent = String(children).replace(/\n$/, '');

            // Для HTML блоков показываем превью вместо кода
            if (!inline && match && match[1] === 'html') {
              const blockId = `html-${hashString(codeContent)}`;
              const showPreview = htmlPreviews[blockId] !== false; // По умолчанию показываем превью

              return (
                <div className="my-0 relative" style={{ marginTop: 0, marginBottom: 0 }}>
                  {showPreview ? (
                    <div className="w-full rounded-lg overflow-hidden border border-white/20 shadow-lg bg-white relative" style={{ height: 'calc(400px * 1.2)', minHeight: 'calc(400px * 1.2)', position: 'relative', margin: 0, padding: 0 }}>
                      <button
                        onClick={() => {
                          setHtmlPreviews(prev => ({
                            ...prev,
                            [blockId]: !prev[blockId]
                          }));
                        }}
                        className="absolute top-2 right-2 z-10 px-3 py-1.5 text-xs font-medium text-white bg-black/70 hover:bg-black/90 rounded-lg transition-colors backdrop-blur-sm border border-white/20"
                      >
                        Показать код
                      </button>
                      <iframe
                        srcDoc={enhanceHtmlForIframe(codeContent)}
                        className="w-full h-full"
                        style={{ width: '100%', height: '100%', border: 'none', display: 'block', margin: 0, padding: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        title="HTML Preview"
                        sandbox="allow-same-origin allow-scripts"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="mb-2 flex justify-end">
                        <button
                          onClick={() => {
                            setHtmlPreviews(prev => ({
                              ...prev,
                              [blockId]: !prev[blockId]
                            }));
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-black/70 hover:bg-black/90 rounded-lg transition-colors backdrop-blur-sm border border-white/20"
                        >
                          Показать превью
                        </button>
                      </div>
                      <div className="overflow-x-auto w-full rounded-lg border border-white/20">
                        <SyntaxHighlighterWrapper language="html" {...props}>
                          {codeContent}
                        </SyntaxHighlighterWrapper>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return !inline && match ? (
              <div className="overflow-x-auto w-full rounded-lg border border-white/20 my-2">
                <SyntaxHighlighterWrapper language={match[1]} {...props}>
                  {codeContent}
                </SyntaxHighlighterWrapper>
              </div>
            ) : (
              <code className={`${className} bg-slate-800/80 px-1.5 py-0.5 rounded text-amber-200 font-mono text-sm border border-slate-700/50`} {...props}>
                {children}
              </code>
            );
          },
          // Кастомные стили для всех markdown элементов
          
          ul({ children }) {
            return (
              <ul 
                className="list-disc [&:first-child]:!mt-0 [&:last-child]:!mb-0"
                style={{
                  marginTop: spacing.list,
                  marginBottom: spacing.list,
                  paddingLeft: '1.25rem',
                  color: 'rgba(255, 255, 255, 0.95)',
                }}
              >
                {children}
              </ul>
            );
          },
          ol({ node, children, ...props }: any) {
            // Пытаемся определить start значение из первого элемента списка
            let startValue: number | undefined = undefined;
            if (node && node.children && node.children.length > 0) {
              const firstChild = node.children[0];
              if (firstChild.children && firstChild.children.length > 0) {
                const firstText = firstChild.children[0].value || '';
                const match = firstText.match(/^(\d+)\.\s/);
                if (match) {
                  startValue = parseInt(match[1], 10);
                }
              }
            }
            return (
              <ol 
                {...(startValue ? { start: startValue } : {})}
                className="list-decimal [&:first-child]:!mt-0 [&:last-child]:!mb-0"
                style={{
                  marginTop: spacing.list,
                  marginBottom: spacing.list,
                  paddingLeft: '1.25rem',
                  color: 'rgba(255, 255, 255, 0.95)',
                }}
              >
                {children}
              </ol>
            );
          },
          li({ children }) {
            return (
              <li 
                style={{ 
                  display: 'list-item',
                  marginTop: spacing.listItem,
                  marginBottom: spacing.listItem,
                  lineHeight: spacing.lineHeight,
                }}
              >
                {children}
              </li>
            );
          },
          a({ href, children }) {
            return (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
              >
                {children}
              </a>
            );
          },
          p({ children }) {
            return (
              <p 
                className="[&:last-child]:!mb-0"
                style={{ 
                  marginTop: 0, 
                  marginBottom: spacing.paragraph, 
                  lineHeight: spacing.lineHeight,
                  color: 'rgba(255, 255, 255, 0.95)',
                }}
              >
                {children}
              </p>
            );
          },
          h1({ children }) {
            return (
              <h1 
                className="[&:first-child]:!mt-0"
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 1)',
                  marginTop: spacing.heading,
                  marginBottom: '0.75rem',
                  lineHeight: '1.2',
                }}
              >
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 
                className="[&:first-child]:!mt-0"
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 1)',
                  marginTop: spacing.heading,
                  marginBottom: '0.5rem',
                  lineHeight: '1.3',
                }}
              >
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 
                className="[&:first-child]:!mt-0"
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 1)',
                  marginTop: spacing.heading,
                  marginBottom: '0.5rem',
                  lineHeight: '1.4',
                }}
              >
                {children}
              </h3>
            );
          },
          strong({ children }) {
            return (
              <strong 
                style={{
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 1)',
                }}
              >
                {children}
              </strong>
            );
          },
          em({ children }) {
            return (
              <em 
                style={{
                  fontStyle: 'italic',
                  color: 'rgba(255, 255, 255, 0.95)',
                }}
              >
                {children}
              </em>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote 
                className="[&:first-child]:!mt-0 [&:last-child]:!mb-0"
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor: 'rgba(99, 102, 241, 0.5)',
                  paddingLeft: '1rem',
                  marginTop: spacing.blockquote,
                  marginBottom: spacing.blockquote,
                  fontStyle: 'italic',
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                {children}
              </blockquote>
            );
          },
          hr() {
            return (
              <hr 
                style={{ 
                  marginTop: spacing.heading, 
                  marginBottom: spacing.heading,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  borderWidth: '1px 0 0 0',
                }} 
              />
            );
          },
          table({ children }) {
            return (
              <div
                className="my-4 overflow-x-auto" 
                style={{ 
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0,
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'thin',
                  overflowY: 'visible',
                  display: 'block'
                }}
              >
                <table
                  className="border-collapse text-left w-full"
                  style={{ 
                    width: '100%',
                    tableLayout: 'auto',
                    display: 'table'
                  }}
                >
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead>{children}</thead>;
          },
          tbody({ children }) {
            return <tbody>{children}</tbody>;
          },
          tr({ children }) {
            return <tr>{children}</tr>;
          },
          th({ children }) {
            return (
              <th
                className="border border-white/20 px-4 py-2 text-left font-semibold text-white align-top break-words min-w-[240px] sm:min-w-0"
                style={{
                  lineHeight: '1.4',
                  maxWidth: '260px',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word'
                }}
              >
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td
                className="border border-white/10 px-4 py-2 text-white/90 align-top break-words min-w-[240px] sm:min-w-0"
                style={{
                  lineHeight: '1.4',
                  maxWidth: '260px',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word'
                }}
              >
                {children}
              </td>
            );
          }
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
};