import React from 'react';
import { ExternalLink } from 'lucide-react';

interface ResearchHeaderProps {
  title: string;
  authors: string[];
  publisher: string;
  publicationYear?: number | null;
  venue?: string | null;
  doi?: string | null;
  url: string;
}

export function ResearchHeader({
  title,
  authors,
  publisher,
  publicationYear,
  venue,
  doi,
  url,
}: ResearchHeaderProps) {
  return (
    <header className="border-b border-border/80 pb-8 mb-8">
      <div className="flex items-start justify-between gap-4 mb-4">
        <h1 className="text-3xl sm:text-4xl font-serif font-medium tracking-tight text-foreground leading-[1.2]">
          {title}
        </h1>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card/60 hover:bg-card text-xs font-mono text-muted-foreground hover:text-foreground transition-colors shadow-xs"
          title="Open original paper URL"
        >
          <span>Publisher Source</span>
          <ExternalLink className="w-3 h-3 text-brand-primary" />
        </a>
      </div>

      <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm font-sans font-normal text-muted-foreground mb-4">
        {authors.map((author, index) => (
          <span key={index}>
            {author}
            {index < authors.length - 1 ? ' ·' : ''}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground font-mono">
        {venue && <span className="bg-card-muted/80 px-2 py-0.5 rounded-md border border-border/50">{venue}</span>}
        {publisher && <span className="text-foreground/80 font-medium">{publisher}</span>}
        {publicationYear && <span>({publicationYear})</span>}
        {doi && (
          <a
            href={`https://doi.org/${doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline flex items-center gap-1 text-brand-primary font-medium"
          >
            <span>DOI: {doi}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
    </header>
  );
}
