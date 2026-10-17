'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLink, Copy, Check } from 'lucide-react';

interface AssistantMarkdownProps {
  content: string;
}

/**
 * Normalizes text to ensure proper emdashes (—) and clean typography
 * while strictly protecting markdown table syntax, horizontal rules, and code fences.
 */
function normalizeEmdashesAndTypography(rawText: string): string {
  if (!rawText) return '';

  const parts = rawText.split(/(```[\s\S]*?```|`[^`]+`)/g);

  return parts
    .map((part) => {
      if (part.startsWith('`')) return part;

      const lines = part.split('\n');
      const processed: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Strictly protect markdown table rows and separators (any line containing '|')
        if (trimmed.includes('|')) {
          // If previous line was non-empty and not a table row, ensure an empty line before the table
          if (i > 0 && !lines[i - 1].trim().includes('|') && lines[i - 1].trim() !== '') {
            processed.push('');
          }
          processed.push(line);
          continue;
        }

        // If previous line was a table row and current line is non-empty normal text, ensure an empty line after the table
        if (i > 0 && lines[i - 1].trim().includes('|') && trimmed !== '') {
          processed.push('');
        }

        // Protect standalone markdown horizontal rules (e.g. --- or *** or ___)
        if (/^[-*_]{3,}$/.test(trimmed)) {
          processed.push(line);
          continue;
        }

        // Replace standalone double hyphens -- with proper typographic emdash —
        const formatted = line
          .replace(/([a-zA-Z0-9])\s*--\s*([a-zA-Z0-9])/g, '$1 — $2')
          .replace(/\s+--\s+/g, ' — ')
          .replace(/([a-zA-Z0-9])\s*---\s*([a-zA-Z0-9])/g, '$1 — $2');

        processed.push(formatted);
      }

      return processed.join('\n');
    })
    .join('');
}

function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const codeString = String(children).replace(/\n$/, '');
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-xl border border-white/10 bg-[#161618] overflow-hidden font-mono text-[11px] shadow-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/4 border-b border-white/8 text-[#9a9aa0] select-none">
        <span className="text-[10px] uppercase tracking-wider font-semibold">
          {lang || 'code'}
        </span>
        <button
          onClick={handleCopy}
          type="button"
          className="inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[#f4f4f5] font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function AssistantMarkdown({ content }: AssistantMarkdownProps) {
  const processed = normalizeEmdashesAndTypography(content);

  return (
    <div className="text-xs sm:text-[13px] leading-relaxed text-[#e4e4e7] font-sans space-y-2.5 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-white hover:text-white/80 underline underline-offset-2 decoration-white/40 hover:decoration-white break-all transition-colors"
              >
                <span>{children}</span>
                <ExternalLink className="w-3 h-3 inline-block shrink-0 opacity-80" />
              </a>
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
          code({ className, children, ...props }: any) {
            const isInline = !className && !String(children).includes('\n');
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-white/10 text-[#f4f4f5] border border-white/10"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },
          h1({ children }) {
            return (
              <h1 className="text-base font-sans font-semibold text-[#f4f4f5] mt-4 mb-2 tracking-tight border-b border-white/10 pb-1">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-sm font-sans font-semibold text-[#f4f4f5] mt-3 mb-1.5 tracking-tight">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-xs font-sans font-medium uppercase tracking-wider text-[#9a9aa0] mt-3 mb-1">
                {children}
              </h3>
            );
          },
          p({ children }) {
            return <p className="my-1.5 leading-relaxed text-[#e4e4e7]">{children}</p>;
          },
          strong({ children }) {
            return <strong className="font-semibold text-white">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-[#d4d4d8]">{children}</em>;
          },
          ul({ className, children, ...props }: any) {
            const isTaskList = className?.includes('contains-task-list');
            return (
              <ul
                className={`${isTaskList ? 'list-none pl-0 space-y-1.5' : 'list-disc pl-5 space-y-1'} my-2 text-[#e4e4e7] font-sans`}
                style={isTaskList ? { listStyleType: 'none', paddingLeft: 0 } : undefined}
                {...props}
              >
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 my-2 space-y-1 text-[#e4e4e7]">{children}</ol>;
          },
          li({ className, children, node, ...props }: any) {
            const isTask =
              className?.includes('task-list-item') ||
              Boolean(node?.checked !== undefined && node?.checked !== null);

            if (isTask) {
              return (
                <li
                  className="list-none flex items-start gap-2 text-[#e4e4e7] leading-relaxed my-1.5 pb-0.5"
                  style={{ listStyle: 'none', listStyleType: 'none' }}
                  {...props}
                >
                  {children}
                </li>
              );
            }
            return (
              <li className="leading-relaxed" {...props}>
                {children}
              </li>
            );
          },
          input({ type, checked, ...props }: any) {
            if (type === 'checkbox') {
              return (
                <span className="inline-flex items-center justify-center shrink-0 select-none mt-[3px]">
                  {checked ? (
                    <span className="w-3.5 h-3.5 rounded-[4px] bg-emerald-500/25 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-2xs">
                      <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                    </span>
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-[4px] bg-white/5 border border-white/25 flex items-center justify-center hover:border-white/40 transition-colors" />
                  )}
                </span>
              );
            }
            return <input type={type} checked={checked} {...props} />;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-white/20 pl-3 my-2 text-[#d4d4d8] italic bg-white/4 py-1.5 rounded-r-md">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="my-3 w-full overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] shadow-xs [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]">
                <table className="w-full text-left border-collapse text-xs min-w-[380px] font-sans">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return (
              <thead className="bg-white/[0.05] text-white font-medium border-b border-white/10">
                {children}
              </thead>
            );
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-white/[0.04]">{children}</tbody>;
          },
          tr({ children }) {
            return (
              <tr className="hover:bg-white/[0.025] transition-colors border-b border-white/[0.04] last:border-0">
                {children}
              </tr>
            );
          },
          th({ children }) {
            return (
              <th className="px-3.5 py-2.5 text-left text-[12px] font-semibold text-[#f4f4f5] tracking-tight border-b border-white/10 whitespace-nowrap bg-white/[0.04]">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-3.5 py-2 text-[12px] text-[#e4e4e7] border-b border-white/[0.04] leading-relaxed break-words whitespace-normal">
                {children}
              </td>
            );
          },
          hr() {
            return <hr className="my-3 border-white/10" />;
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
