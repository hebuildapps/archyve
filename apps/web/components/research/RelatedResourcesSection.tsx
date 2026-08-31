import React, { useState } from 'react';
import { Github, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { BrandExternalArrow } from '@/components/ui/BrandExternalArrow';

export interface RelatedPaper {
  title: string;
  authors: string[];
  url?: string;
  relationship?: string;
}

export interface Implementation {
  name: string;
  url: string;
  type: 'github' | 'official' | 'dataset' | 'other';
  stars?: number | null;
}

interface RelatedResourcesSectionProps {
  relatedPapers: RelatedPaper[];
  implementations: Implementation[];
}

export function RelatedResourcesSection({
  relatedPapers = [],
  implementations = [],
}: RelatedResourcesSectionProps) {
  const [showAllPapers, setShowAllPapers] = useState(false);

  if (relatedPapers.length === 0 && implementations.length === 0) {
    return null;
  }

  const visiblePapers = showAllPapers ? relatedPapers : relatedPapers.slice(0, 3);

  return (
    <section className="mb-10 space-y-8">
      {/* Implementations & Datasets */}
      {implementations.length > 0 && (
        <div>
          <h2 className="text-xs font-mono uppercase tracking-wider text-brand-primary mb-3.5 font-semibold">
            Code & Datasets
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {implementations.map((impl, index) => (
              <a
                key={index}
                href={impl.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-muted-foreground/40 transition-colors shadow-xs group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {impl.type === 'github' ? (
                    <Github className="w-5 h-5 text-foreground shrink-0" />
                  ) : (
                    <BookOpen className="w-5 h-5 text-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono text-muted-foreground capitalize">
                      {impl.type} Implementation
                    </div>
                    <div className="text-sm font-semibold text-foreground truncate group-hover:text-brand-primary transition-colors">
                      {impl.name}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {impl.stars !== undefined && impl.stars !== null && (
                    <span className="text-xs text-muted-foreground font-mono bg-card-muted px-2 py-0.5 rounded border border-border/50">
                      ★ {impl.stars.toLocaleString()}
                    </span>
                  )}
                  <BrandExternalArrow />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Related Papers */}
      {relatedPapers.length > 0 && (
        <div>
          <h2 className="text-xs font-mono uppercase tracking-wider text-brand-primary mb-3.5 font-semibold">
            Related Literature
          </h2>
          <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-card shadow-xs">
            {visiblePapers.map((paper, index) => {
              const Content = (
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    {paper.relationship && (
                      <span className="inline-block text-[10px] font-mono uppercase tracking-wider text-brand-primary bg-highlight-glow/20 border border-brand-primary/20 px-2 py-0.5 rounded">
                        {paper.relationship}
                      </span>
                    )}
                    <h3 className="text-sm font-serif font-medium text-foreground leading-snug group-hover:text-brand-primary transition-colors">
                      {paper.title}
                    </h3>
                    <p className="text-xs text-muted-foreground font-sans">
                      {paper.authors.join(', ')}
                    </p>
                  </div>
                  {paper.url && (
                    <div className="p-1.5 rounded-md text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-0.5">
                      <BrandExternalArrow />
                    </div>
                  )}
                </div>
              );

              return paper.url ? (
                <a
                  key={index}
                  href={paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 hover:bg-card-muted/40 transition-colors group cursor-pointer"
                >
                  {Content}
                </a>
              ) : (
                <div key={index} className="p-4">
                  {Content}
                </div>
              );
            })}
          </div>

          {relatedPapers.length > 3 && (
            <button
              onClick={() => setShowAllPapers(!showAllPapers)}
              className="mt-3 flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAllPapers ? (
                <>
                  <span>Show Fewer Papers</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Show All {relatedPapers.length} Papers</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
