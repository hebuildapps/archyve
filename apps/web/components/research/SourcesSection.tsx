import React from 'react';
import { Database } from 'lucide-react';
import { Source } from '@archyve/shared';
import { BrandExternalArrow } from '@/components/ui/BrandExternalArrow';

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
        {sources.map((source) => {
          const isCommunityOrAi = source.id === 'ai_analysis' || source.type === 'community';
          const typeLabel = isCommunityOrAi ? 'Star' : source.type;
          const targetUrl = source.id === 'ai_analysis' ? 'https://github.com/hebuildapps/archyve' : source.url;

          return (
            <div key={source.id} className="flex items-center gap-1.5 font-mono text-muted-foreground group">
              <span className="text-muted-foreground/70">
                [
                <span className={isCommunityOrAi ? 'text-amber-500 dark:text-yellow-400 font-medium' : 'capitalize'}>
                  {typeLabel}
                </span>
                ]
              </span>
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-brand-primary underline decoration-border hover:decoration-brand-primary underline-offset-4 flex items-center gap-1.5 transition-colors"
              >
                <span>{source.name}</span>
                <BrandExternalArrow className="h-3 w-3" />
              </a>
              {source.confidence !== undefined && (
                <span className="text-[10px] text-muted-foreground/80">
                  ({Math.round(source.confidence * 100)}%)
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
