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
      {/* Key Technical Points Identified */}
      <div>
        <h2 className="text-xs font-mono uppercase tracking-wider text-brand-primary mb-3 font-semibold">
          Key Technical Points Identified
        </h2>
        <ul className="space-y-3">
          {keyContributions.map((contribution, index) => (
            <li key={index} className="flex items-start gap-3 text-foreground/90 text-sm leading-relaxed">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
              <span>{contribution}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Domain Context */}
      <div>
        <h2 className="text-xs font-mono uppercase tracking-wider text-brand-primary mb-3 font-semibold">
          Research Context
        </h2>
        <p className="text-foreground/90 text-sm leading-relaxed bg-card p-4 rounded-xl border border-border/70 font-sans">
          {researchContext}
        </p>
      </div>

      {/* Related Concepts */}
      {relatedConcepts.length > 0 && (
        <div>
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2.5 font-medium">
            Related Academic Concepts
          </h2>
          <div className="flex flex-wrap gap-2">
            {relatedConcepts.map((concept, index) => (
              <span
                key={index}
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-card-muted/60 border border-border text-muted-foreground hover:text-foreground transition-colors"
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
