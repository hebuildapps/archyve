import React from 'react';
import { ExternalLink, Database } from 'lucide-react';
import { Source } from '@archyve/shared';

interface SourcesSectionProps {
  sources: Source[];
}

export function SourcesSection({ sources }: SourcesSectionProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <section className="border-t border-zinc-200 dark:border-zinc-800/80 pt-8 mt-10 mb-16">
      <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4 flex items-center gap-1.5">
        <Database className="w-3.5 h-3.5" />
        <span>Sources & Intelligence Attributions</span>
      </h2>
      <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
        {sources.map((source) => (
          <div key={source.id} className="flex items-center gap-1.5 font-mono text-zinc-500 dark:text-zinc-400">
            <span className="capitalize text-zinc-400 dark:text-zinc-600">[{source.type}]</span>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-2 flex items-center gap-0.5"
            >
              <span>{source.name}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            {source.confidence !== undefined && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                (conf: {Math.round(source.confidence * 100)}%)
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
