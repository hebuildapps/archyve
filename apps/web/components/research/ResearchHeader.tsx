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
    <header className="border-b border-zinc-200 dark:border-zinc-800/80 pb-8 mb-8">
      <div className="flex items-start justify-between gap-4 mb-4">
        <h1 className="text-3xl font-serif font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
          {title}
        </h1>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800/80 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
          title="Open original paper URL"
        >
          <span>Publisher Source</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-4">
        {authors.map((author, index) => (
          <span key={index}>
            {author}
            {index < authors.length - 1 ? ' ·' : ''}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400 dark:text-zinc-500 font-mono">
        {venue && <span>{venue}</span>}
        {publisher && <span>{publisher}</span>}
        {publicationYear && <span>{publicationYear}</span>}
        {doi && (
          <a
            href={`https://doi.org/${doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline flex items-center gap-0.5"
          >
            <span>DOI: {doi}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
    </header>
  );
}
