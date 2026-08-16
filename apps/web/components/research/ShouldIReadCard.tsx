import React from 'react';
import { Clock } from 'lucide-react';

interface ShouldIReadCardProps {
  score: number;
  explanation: string;
  relevanceTopics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadingTime: string;
}

export function ShouldIReadCard({
  score,
  explanation,
  relevanceTopics,
  difficulty,
  estimatedReadingTime,
}: ShouldIReadCardProps) {
  const getDifficultyColor = (diff: typeof difficulty) => {
    switch (diff) {
      case 'beginner':
        return 'text-brand-primary bg-highlight-glow/20 border border-brand-primary/20';
      case 'intermediate':
        return 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20';
      case 'advanced':
        return 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20';
    }
  };

  return (
    <div className="border border-border rounded-2xl bg-card p-6 mb-10 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border mb-6">
        <div>
          <h2 className="text-xs font-mono uppercase tracking-wider text-brand-primary mb-1.5 font-semibold">
            Should you read this?
          </h2>
          <p className="text-sm font-sans text-muted-foreground leading-relaxed max-w-xl">
            {explanation}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-baseline gap-1 bg-foreground text-background px-4 py-2 rounded-xl font-serif shadow-xs">
            <span className="text-2xl font-bold">{score.toFixed(1)}</span>
            <span className="text-xs opacity-70 font-mono">/5</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
        <div>
          <div className="text-xs font-mono text-muted-foreground mb-2">Relevance Focus</div>
          <div className="flex flex-wrap gap-1.5">
            {relevanceTopics.map((topic, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-card-muted text-foreground border border-border/60"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-mono text-muted-foreground mb-2">Reading Difficulty</div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono capitalize ${getDifficultyColor(
              difficulty
            )}`}
          >
            {difficulty}
          </span>
        </div>

        <div>
          <div className="text-xs font-mono text-muted-foreground mb-2">Est. Reading Time</div>
          <div className="flex items-center gap-1.5 text-foreground font-medium font-mono text-xs">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{estimatedReadingTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
