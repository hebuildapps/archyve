import React from 'react';

interface ResearchContextSectionProps {
  keyContributions: string[];
  researchContext: string;
  relatedConcepts: string[];
}

export function ResearchContextSection({
  keyContributions,
  researchContext,
  relatedConcepts,
}: ResearchContextSectionProps) {
  return (
    <section className="mb-10 space-y-8">
      {/*Key Technical Points Identified */}
      <div>
        <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
          Key Technical Points Identified
        </h2>
        <ul className="space-y-2.5">
          {keyContributions.map((contribution, index) => (
            <li key={index} className="flex items-start gap-2.5 text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600 shrink-0" />
              <span>{contribution}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Domain Context */}
      <div>
        <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
          Research Context
        </h2>
        <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
          {researchContext}
        </p>
      </div>

      {/* Related Concepts */}
      {relatedConcepts.length > 0 && (
        <div>
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2.5">
            Related Academic Concepts
          </h2>
          <div className="flex flex-wrap gap-2">
            {relatedConcepts.map((concept, index) => (
              <span
                key={index}
                className="px-2.5 py-1 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono"
              >
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
