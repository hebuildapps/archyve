import React, { useState } from 'react';
import { ExternalLink, Github, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface RelatedPaper {
  title: string;
  authors: string[];
  url?: string;
  relationship?: string;
}

interface Implementation {
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
  relatedPapers,
  implementations,
}: RelatedResourcesSectionProps) {
  const [showAllPapers, setShowAllPapers] = useState(false);
  const visiblePapers = showAllPapers ? relatedPapers : relatedPapers.slice(0, 3);

  return (
    <section className="mb-10 space-y-8">
      {/* Implementations & Datasets */}
      {implementations.length > 0 && (
        <div>
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3.5">
            Code & Datasets
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {implementations.map((impl, index) => (
              <a
                key={index}
                href={impl.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {impl.type === 'github' ? (
                    <Github className="w-5 h-5 text-zinc-700 dark:text-zinc-300 shrink-0" />
                  ) : (
                    <BookOpen className="w-5 h-5 text-zinc-700 dark:text-zinc-300 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-zinc-400 dark:text-zinc-500 capitalize">
                      {impl.type} Implementation
                    </div>
                    <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {impl.name}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {impl.stars !== undefined && impl.stars !== null && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                      ★ {impl.stars.toLocaleString()}
                    </span>
                  )}
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Related Papers */}
      {relatedPapers.length > 0 && (
        <div>
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3.5">
            Related Literature
          </h2>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80 border border-zinc-200 dark:border-zinc-800/80 rounded-lg overflow-hidden">
            {visiblePapers.map((paper, index) => (
              <div key={index} className="p-4 bg-zinc-50/10 dark:bg-zinc-900/5 hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    {paper.relationship && (
                      <span className="inline-block text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                        {paper.relationship}
                      </span>
                    )}
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                      {paper.title}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {paper.authors.join(', ')}
                    </p>
                  </div>
                  {paper.url && (
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {relatedPapers.length > 3 && (
            <button
              onClick={() => setShowAllPapers(!showAllPapers)}
              className="mt-3 flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
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
