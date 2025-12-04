import React, { useState, useEffect } from 'react';

// Динамический импорт для оптимизации и совместимости с React 19
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

interface SyntaxHighlighterWrapperProps {
  language: string;
  children: string;
  isFullscreenView?: boolean;
}

export const SyntaxHighlighterWrapper: React.FC<SyntaxHighlighterWrapperProps> = ({ 
  language, 
  children, 
  isFullscreenView 
}) => {
  const [isReady, setIsReady] = useState(false);
  const [highlighter, setHighlighter] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    loadSyntaxHighlighter().then(({ SyntaxHighlighter: SH, vscDarkPlus: style }) => {
      if (mounted) {
        setHighlighter({ Component: SH, style });
        setIsReady(true);
      }
    });
    return () => { mounted = false; };
  }, []);

  if (!isReady || !highlighter) {
    return (
      <div className="bg-black/50 p-4 rounded-xl border border-white/10 font-mono text-sm text-white/70">
        {children}
      </div>
    );
  }

  const { Component, style } = highlighter;
  return (
    <Component
      style={style}
      language={language}
      PreTag="div"
      customStyle={{
        margin: 0,
        borderRadius: isFullscreenView ? '1.5rem' : '1rem',
        padding: isFullscreenView ? '1.5rem' : '1.5rem',
        minHeight: 0,
        maxHeight: '100%',
      }}
    >
      {children}
    </Component>
  );
};


