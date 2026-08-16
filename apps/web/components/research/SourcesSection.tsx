import React from 'react';
import { ExternalLink, Database } from 'lucide-react';
import { Source } from '@archyve/shared';

interface SourcesSectionProps {
  sources: Source[];
}

export function SourcesSection({ sources }: SourcesSectionProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <section className="border-t border-border pt-8 mt-10 mb-16">
      <h2 className="text-xs font-mono uppercase tracking-wider text-brand-primary mb-4 flex items-center gap-1.5 font-semibold">
        <Database className="w-3.5 h-3.5" />
        <span>Sources & Intelligence Attributions</span>
      </h2>
      <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
        {sources.map((source) => (
          <div key={source.id} className="flex items-center gap-1.5 font-mono text-muted-foreground">
            <span className="capitalize text-muted-foreground/70">[{source.type}]</span>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-brand-primary underline decoration-border hover:decoration-brand-primary underline-offset-4 flex items-center gap-1 transition-colors"
            >
              <span>{source.name}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            {source.confidence !== undefined && (
              <span className="text-[10px] text-muted-foreground/80">
                ({Math.round(source.confidence * 100)}%)
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
