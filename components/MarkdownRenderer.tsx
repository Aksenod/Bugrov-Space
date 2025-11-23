import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-invert prose-sm max-w-none break-words leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={`${className} bg-slate-800/80 px-1.5 py-0.5 rounded text-amber-200 font-mono text-sm border border-slate-700/50`} {...props}>
                {children}
              </code>
            );
          },
          ul({ children }) {
            return <ul className="list-disc ml-5 my-3 space-y-2 text-white/90">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal ml-5 my-3 space-y-2 text-white/90">{children}</ol>;
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
                {children}
              </a>
            );
          },
          p({ children }) {
            return <p className="mb-3 last:mb-0 text-white/90 leading-loose">{children}</p>;
          },
          h1({ children }) {
            return <h1 className="text-xl font-bold text-white mb-3 mt-4 first:mt-0">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-bold text-white mb-2 mt-4 first:mt-0">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold text-white mb-2 mt-3 first:mt-0">{children}</h3>;
          },
          strong({ children }) {
            return <strong className="font-semibold text-white">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-white/90">{children}</em>;
          },
          blockquote({ children }) {
            return <blockquote className="border-l-4 border-indigo-500/50 pl-4 my-3 text-white/80 italic">{children}</blockquote>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};