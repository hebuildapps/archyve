import React from 'react';

interface SummarySectionProps {
  summary: string;
}

export function SummarySection({ summary }: SummarySectionProps) {
  return (
    <section className="mb-10">
      <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
        Executive Summary
      </h2>
      <div className="text-zinc-700 dark:text-zinc-300 font-serif leading-relaxed text-lg">
        {summary}
      </div>
    </section>
  );
}
