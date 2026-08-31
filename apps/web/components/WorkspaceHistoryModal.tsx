'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutGrid,
  List,
  X,
  History,
  ArrowUpRight,
  Filter,
  FileText
} from 'lucide-react';
import { HistoryPaper, HistoryReportCard } from '@/components/HistoryReportCard';

interface WorkspaceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  papers: HistoryPaper[];
}

type ViewMode = 'grid' | 'list';

export function WorkspaceHistoryModal({
  isOpen,
  onClose,
  papers,
}: WorkspaceHistoryModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPublisher, setSelectedPublisher] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Extract unique publishers from papers
  const publishers = useMemo(() => {
    const pubSet = new Set<string>();
    papers.forEach((p) => {
      if (p.publisher) pubSet.add(p.publisher);
    });
    return Array.from(pubSet);
  }, [papers]);

  // Filter papers by search query and publisher filter
  const filteredPapers = useMemo(() => {
    return papers.filter((paper) => {
      const matchesSearch =
        !searchQuery.trim() ||
        paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paper.publisher.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (paper.authors && paper.authors.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (paper.doi && paper.doi.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (paper.abstract && paper.abstract.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPublisher =
        selectedPublisher === 'all' ||
        paper.publisher.toLowerCase() === selectedPublisher.toLowerCase();

      return matchesSearch && matchesPublisher;
    });
  }, [papers, searchQuery, selectedPublisher]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/35 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[88vh] flex flex-col rounded-3xl border border-border/70 bg-card/75 dark:bg-card/60 shadow-2xl backdrop-blur-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 border-b border-border/60 space-y-4 shrink-0 bg-card/40 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div>
              <h2 className="text-lg sm:text-xl font-serif font-medium text-foreground tracking-tight">
                Workspace Research Corpus
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                your research corpus
              </p>
            </div>
          </div>

          {/* Search Input Bar with Segmented Grid/List Icon Control at the right end */}
          <div className="relative rounded-2xl border border-border/80 bg-background/60 dark:bg-card-muted/40 p-1 shadow-xs flex items-center gap-2 focus-within:border-brand-primary/70 dark:focus-within:border-lime-500/50 transition-colors">
            <div className="pl-3 text-muted-foreground">
              <Search className="w-4 h-4" />
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dossiers by title, author, DOI, or keywords..."
              className="w-full bg-transparent py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none font-sans"
              autoFocus
            />

            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors mr-1"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Segmented Grid / List Icon Toggle on Right End */}
            <div className="flex items-center gap-1 p-1 bg-card-muted/60 dark:bg-card-muted/40 rounded-xl border border-border/60 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid'
                  ? 'bg-brand-primary text-white dark:bg-lime-500 dark:text-neutral-950 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
                title="Grid view"
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list'
                  ? 'bg-brand-primary text-white dark:bg-lime-500 dark:text-neutral-950 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
                title="List view"
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Publisher Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-mono">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 pr-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>

            <button
              onClick={() => setSelectedPublisher('all')}
              className={`px-3 py-1 rounded-full border transition-all shrink-0 ${selectedPublisher === 'all'
                ? 'bg-brand-primary text-white border-brand-primary dark:bg-lime-500 dark:text-neutral-950 dark:border-lime-500 font-semibold shadow-xs'
                : 'bg-card/70 border-border/80 text-muted-foreground hover:text-foreground hover:border-border'
                }`}
            >
              All ({papers.length})
            </button>

            {publishers.map((pub) => {
              const count = papers.filter((p) => p.publisher.toLowerCase() === pub.toLowerCase()).length;
              const isSelected = selectedPublisher.toLowerCase() === pub.toLowerCase();
              return (
                <button
                  key={pub}
                  onClick={() => setSelectedPublisher(pub)}
                  className={`px-3 py-1 rounded-full border transition-all shrink-0 ${isSelected
                    ? 'bg-brand-primary text-white border-brand-primary dark:bg-lime-500 dark:text-neutral-950 dark:border-lime-500 font-semibold shadow-xs'
                    : 'bg-card/70 border-border/80 text-muted-foreground hover:text-foreground hover:border-border'
                    }`}
                >
                  {pub} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {filteredPapers.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl border border-border/80 bg-card-muted/40 flex items-center justify-center mx-auto text-muted-foreground">
                <FileText className="w-5 h-5" />
              </div>
              <p className="text-sm font-serif font-medium text-foreground">No matching dossiers found</p>
              <p className="text-xs text-muted-foreground font-mono">
                Try searching with different keywords or reset publisher filters.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredPapers.map((paper) => (
                <HistoryReportCard key={paper.id} paper={paper} />
              ))}
            </div>
          ) : (
            /* List View */
            <div className="divide-y divide-border/80 border border-border/80 rounded-2xl overflow-hidden bg-card/60 backdrop-blur-md shadow-xs">
              {filteredPapers.map((paper) => (
                <button
                  key={paper.id}
                  onClick={() => {
                    onClose();
                    router.push(`/${encodeURIComponent(paper.url)}`);
                  }}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-card-muted/50 transition-colors group"
                >
                  <div className="min-w-0 pr-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase tracking-wider bg-foreground/5 text-muted-foreground border border-border/60">
                        {paper.publisher}
                      </span>
                      {paper.publication_year && (
                        <span className="text-[10px] font-mono text-muted-foreground/80">
                          {paper.publication_year}
                        </span>
                      )}
                      {paper.doi && (
                        <span className="text-[10px] font-mono text-muted-foreground/50 truncate max-w-[140px] hidden sm:inline">
                          {paper.doi}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-serif font-medium text-foreground truncate group-hover:text-brand-primary dark:group-hover:text-lime-400 transition-colors">
                      {paper.title}
                    </div>
                    {paper.authors && paper.authors.length > 0 && (
                      <div className="text-xs text-muted-foreground font-sans truncate">
                        {paper.authors.join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="p-2 rounded-xl border border-border/60 bg-card group-hover:border-brand-primary/40 group-hover:text-brand-primary dark:group-hover:text-lime-400 transition-colors shrink-0">
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
