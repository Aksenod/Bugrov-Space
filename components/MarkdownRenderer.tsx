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

  return (
    <div className={`prose prose-invert prose-base max-w-none break-words py-0 [&>*]:!my-0 [&>*:first-child]:!mt-0 [&>*:last-child]:!mb-0 ${lineHeightClass}`} style={{ marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}>
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
              <SyntaxHighlighterWrapper language={match[1]} {...props}>
                {codeContent}
              </SyntaxHighlighterWrapper>
            ) : (
              <code className={`${className} bg-slate-800/80 px-1.5 py-0.5 rounded text-amber-200 font-mono text-sm border border-slate-700/50`} {...props}>
                {children}
              </code>
            );
          },
          ul({ children }) {
            return <ul className={`list-disc ml-5 my-3 space-y-2 text-white/95 text-base ${lineHeightClass}`}>{children}</ul>;
          },
          ol({ children }) {
            return <ol className={`list-decimal ml-5 my-3 space-y-2 text-white/95 text-base ${lineHeightClass}`} style={{ counterReset: 'list-counter' }}>{children}</ol>;
          },
          li({ children }) {
            return <li className="[counter-increment:list-counter]" style={{ display: 'list-item' }}>{children}</li>;
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
                {children}
              </a>
            );
          },
          p({ children }) {
            return <p className={`mb-3 last:mb-0 text-white/95 text-base ${lineHeightClass}`}>{children}</p>;
          },
          h1({ children }) {
            return <h1 className="text-2xl font-bold text-white mb-3 mt-4 first:mt-0">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-xl font-bold text-white mb-2 mt-4 first:mt-0">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-lg font-semibold text-white mb-2 mt-3 first:mt-0">{children}</h3>;
          },
          strong({ children }) {
            return <strong className="font-semibold text-white">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-white/95">{children}</em>;
          },
          blockquote({ children }) {
            return <blockquote className={`border-l-4 border-indigo-500/50 pl-4 my-3 text-white/90 italic text-base ${lineHeightClass}`}>{children}</blockquote>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};