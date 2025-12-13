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
  const lineHeightClass = isCompact ? 'leading-[1.5]' : 'leading-relaxed';
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
      
      // Обрабатываем однострочные списки (тире + пробел + текст + (пробел + тире + пробел + текст)*)
      // Но только если строка не является частью таблицы
      const singleLineListPattern = /[—–-]\s+[^—–-]+(?:\s+[—–-]\s+[^—–-]+)+/;
      if (singleLineListPattern.test(trimmedLine)) {
        const parts = trimmedLine.split(/\s+[—–-]\s+/);
        const listItems = parts
          .map(part => part.trim())
          .filter(part => part.length > 0)
          .map(part => `- ${part}`)
          .join('\n');
        
        // Добавляем пустую строку перед списком, если перед ним есть текст
        if (i > 0 && normalizedLines[normalizedLines.length - 1]?.trim() !== '') {
          normalizedLines.push('');
        }
        normalizedLines.push(listItems);
        inList = true;
        continue;
      }
      
      // Проверяем, начинается ли строка с тире (—, –, или -) и пробела
      const isListItem = /^[—–-]\s/.test(trimmedLine);
      
      if (isListItem) {
        // Если это первый элемент списка и перед ним нет пустой строки, добавляем её
        if (!inList && i > 0 && normalizedLines[normalizedLines.length - 1]?.trim() !== '') {
          normalizedLines.push('');
        }
        
        // Преобразуем тире в markdown формат списка
        const listContent = trimmedLine.replace(/^[—–-]\s/, '- ');
        normalizedLines.push(listContent);
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

    return normalizedLines.join('\n');
  };

  const normalizedContent = normalizeListContent(content);
  
  // Временное логирование для отладки
  if (import.meta.env.DEV && content.includes('—')) {
    console.log('[MarkdownRenderer] Original content:', JSON.stringify(content.substring(0, 200)));
    console.log('[MarkdownRenderer] Normalized content:', JSON.stringify(normalizedContent.substring(0, 200)));
    console.log('[MarkdownRenderer] Contains list markers:', normalizedContent.includes('- '));
    console.log('[MarkdownRenderer] First 10 lines of normalized:', normalizedContent.split('\n').slice(0, 10));
  }

  return (
    <div 
      ref={(el) => {
        // #region agent log
        if (el) {
          const computed = window.getComputedStyle(el);
          const parentEl = el.parentElement;
          const parentComputed = parentEl ? window.getComputedStyle(parentEl) : null;
          fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MarkdownRenderer.tsx:265',message:'MarkdownRenderer root mounted',data:{rootWidth:computed.width,rootMinWidth:computed.minWidth,rootMaxWidth:computed.maxWidth,rootOverflowX:computed.overflowX,parentWidth:parentComputed?.width,parentMinWidth:parentComputed?.minWidth,parentOverflowX:parentComputed?.overflowX,parentOverflowY:parentComputed?.overflowY,parentDisplay:parentComputed?.display},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
        }
        // #endregion
      }}
      className={`prose prose-invert prose-base max-w-none break-words py-0 [&>*:first-child]:!mt-0 [&>*:last-child]:!mb-0 ${lineHeightClass} w-full`} style={{ marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0, minWidth: 0 }}>
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
          // Все стили типографики настраиваются в tailwind.config.js → typography.invert.css
          // Здесь оставляем только минимальные классы для функциональности
          
          ul({ children }) {
            return <ul>{children}</ul>;
          },
          ol({ children }) {
            return <ol style={{ counterReset: 'list-counter' }}>{children}</ol>;
          },
          li({ children }) {
            return (
              <li 
                className="[counter-increment:list-counter]"
                style={{ display: 'list-item' }}
              >
                {children}
              </li>
            );
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          p({ children }) {
            return <p data-markdown-p style={{ marginTop: 0, marginBottom: '20px', lineHeight: '1.3' }} className="!mt-0 leading-[1.3]">{children}</p>;
          },
          h1({ children }) {
            return <h1>{children}</h1>;
          },
          h2({ children }) {
            return <h2>{children}</h2>;
          },
          h3({ children }) {
            return <h3>{children}</h3>;
          },
          strong({ children }) {
            return <strong>{children}</strong>;
          },
          em({ children }) {
            return <em>{children}</em>;
          },
          blockquote({ children }) {
            return <blockquote>{children}</blockquote>;
          },
          hr() {
            return <hr style={{ marginTop: '1rem', marginBottom: '1rem' }} />;
          },
          table({ children }) {
            return (
              <div 
                ref={(el) => {
                  // #region agent log
                  if (el) {
                    setTimeout(() => {
                      const computed = window.getComputedStyle(el);
                      const parentComputed = el.parentElement ? window.getComputedStyle(el.parentElement) : null;
                      const tableEl = el.querySelector('table');
                      const tableComputed = tableEl ? window.getComputedStyle(tableEl) : null;
                      fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MarkdownRenderer.tsx:400',message:'Table wrapper after render',data:{wrapperWidth:computed.width,wrapperMaxWidth:computed.maxWidth,wrapperOverflowX:computed.overflowX,wrapperOverflowY:computed.overflowY,parentWidth:parentComputed?.width,parentMinWidth:parentComputed?.minWidth,parentOverflowX:parentComputed?.overflowX,tableWidth:tableComputed?.width,tableMinWidth:tableComputed?.minWidth,tableScrollWidth:tableEl?.scrollWidth,tableClientWidth:tableEl?.clientWidth,wrapperScrollWidth:el.scrollWidth,wrapperClientWidth:el.clientWidth},timestamp:Date.now(),sessionId:'debug-session',runId:'fix5',hypothesisId:'F,G'})}).catch(()=>{});
                    }, 100);
                  }
                  // #endregion
                }}
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
                ref={(el) => {
                  // #region agent log
                  if (el) {
                    const computed = window.getComputedStyle(el);
                    fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MarkdownRenderer.tsx:439',message:'Table cell rendered',data:{cellWidth:computed.width,cellMinWidth:computed.minWidth,cellMaxWidth:computed.maxWidth,cellScrollWidth:el.scrollWidth,cellClientWidth:el.clientWidth,textContent:el.textContent?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'fix4',hypothesisId:'G'})}).catch(()=>{});
                  }
                  // #endregion
                }}
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